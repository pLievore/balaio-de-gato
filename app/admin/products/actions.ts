'use server';

import { del, put } from '@vercel/blob';
import { revalidatePath, revalidateTag } from 'next/cache';

import { CATALOG_CACHE_TAG } from '../../../src/lib/catalog/repository';
import { hasValidPanelSession } from '../../../src/lib/panel/session';
import {
  adjustStock,
  addProductMedia,
  createPanelProduct,
  removeProductMedia,
  updatePanelProduct,
} from '../../../src/lib/panel/catalog-write';
import {
  collectProductErrors,
  productFormSchema,
  type ProductFieldErrors,
} from '../../../src/lib/panel/product-form';

export type ProductActionState =
  | { status: 'idle' }
  | { status: 'invalid'; fieldErrors: ProductFieldErrors; formError?: string }
  | { status: 'error'; message: string }
  | { status: 'success'; slug: string; message: string };

async function guard(): Promise<string | null> {
  return (await hasValidPanelSession()) ? null : 'Sessão expirada. Entre novamente no painel.';
}

function readForm(formData: FormData) {
  return productFormSchema.safeParse({
    slug: formData.get('slug'),
    name: formData.get('name'),
    brand: formData.get('brand'),
    tagline: formData.get('tagline'),
    description: formData.get('description'),
    status: formData.get('status'),
    categorySlug: formData.get('categorySlug'),
    illustrationKey: formData.get('illustrationKey') ?? '',
    sku: formData.get('sku'),
    price: formData.get('price'),
    compareAtPrice: formData.get('compareAtPrice') ?? '',
    maxPerOrder: formData.get('maxPerOrder'),
    keywords: formData.get('keywords') ?? '',
    specifications: formData.get('specifications') ?? '',
    // Checkboxes com o mesmo nome chegam como várias entradas.
    stageSlugs: formData.getAll('stageSlugs').map(String),
  });
}

/**
 * Cria ou atualiza um produto.
 *
 * `originalSlug` vazio significa criação. O slug pode mudar na edição, então a
 * identidade vem do valor antigo, não do que está no formulário.
 */
export async function saveProductAction(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const denied = await guard();
  if (denied) return { status: 'error', message: denied };

  const parsed = readForm(formData);
  if (!parsed.success) {
    return { status: 'invalid', fieldErrors: collectProductErrors(parsed.error) };
  }

  const data = parsed.data;
  const originalSlug = String(formData.get('originalSlug') ?? '').trim();

  const input = {
    slug: data.slug,
    name: data.name,
    brand: data.brand,
    tagline: data.tagline,
    description: data.description,
    status: data.status,
    illustrationKey: data.illustrationKey || null,
    keywords: data.keywords,
    specifications: data.specifications,
    categorySlug: data.categorySlug,
    sku: data.sku,
    priceCents: data.price,
    compareAtPriceCents: data.compareAtPrice,
    maxPerOrder: data.maxPerOrder,
    stageSlugs: data.stageSlugs,
  };

  try {
    if (originalSlug) {
      await updatePanelProduct(originalSlug, input);
    } else {
      await createPanelProduct(input);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível salvar o produto.';
    // Violação de unicidade tem mensagem crua do Postgres; traduz para o campo.
    if (/products_slug_uidx|duplicate key/i.test(message)) {
      return {
        status: 'invalid',
        fieldErrors: { slug: 'Já existe um produto com este endereço.' },
      };
    }
    if (/product_variants_sku|sku/i.test(message) && /duplicate|unique/i.test(message)) {
      return { status: 'invalid', fieldErrors: { sku: 'Já existe um produto com este SKU.' } };
    }
    return { status: 'error', message };
  }

  // O catálogo enxuto do carrinho é servido de `unstable_cache` com etiqueta;
  // `revalidatePath` não alcança essa entrada, e sem isto preço, estoque,
  // limite e etapas continuariam defasados no carrinho até o TTL vencer.
  //
  // O perfil `'max'` marca a entrada como velha e revalida em segundo plano na
  // próxima visita. A forma de um argumento só está depreciada no Next 16.
  revalidateTag(CATALOG_CACHE_TAG, 'max');
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${data.slug}`);
  revalidatePath('/products');
  revalidatePath(`/products/${data.slug}`);

  return {
    status: 'success',
    slug: data.slug,
    message: originalSlug ? 'Produto atualizado.' : 'Produto cadastrado.',
  };
}

export type StockActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string };

/**
 * Ajusta o estoque físico. O motivo é obrigatório porque ele vai para a trilha
 * de auditoria — "ajuste" sem explicação não serve a uma prestação de contas.
 */
export async function adjustStockAction(
  _previous: StockActionState,
  formData: FormData,
): Promise<StockActionState> {
  const denied = await guard();
  if (denied) return { status: 'error', message: denied };

  const slug = String(formData.get('slug') ?? '');
  const onHand = Number(formData.get('onHand'));
  const reason = String(formData.get('reason') ?? '').trim();

  if (!slug) return { status: 'error', message: 'Produto não informado.' };
  if (!Number.isInteger(onHand) || onHand < 0) {
    return { status: 'error', message: 'Informe uma quantidade inteira e não negativa.' };
  }
  if (reason.length < 3) {
    return { status: 'error', message: 'Explique o motivo do ajuste — ele fica registrado.' };
  }

  try {
    await adjustStock(slug, { onHand, reason });
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Não foi possível ajustar o estoque.',
    };
  }

  revalidateTag(CATALOG_CACHE_TAG, 'max');
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${slug}`);
  revalidatePath(`/products/${slug}`);
  return { status: 'success', message: 'Estoque ajustado e movimento registrado.' };
}

// ─── Mídia ───────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export type MediaActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string };

export async function uploadProductImageAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const denied = await guard();
  if (denied) return { status: 'error', message: denied };

  const slug = String(formData.get('slug') ?? '');
  const file = formData.get('file');
  const altText = String(formData.get('altText') ?? '').trim();

  if (!slug) return { status: 'error', message: 'Produto não informado.' };
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Escolha uma imagem.' };
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { status: 'error', message: 'Use JPEG, PNG, WebP ou AVIF.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { status: 'error', message: 'A imagem passa de 5 MB. Reduza antes de enviar.' };
  }

  try {
    const blob = await put(`produtos/${slug}/${crypto.randomUUID()}`, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
    });

    await addProductMedia(slug, {
      objectKey: blob.url,
      mimeType: file.type,
      altText: altText || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao enviar a imagem.';
    if (/BLOB_READ_WRITE_TOKEN|No token found/i.test(message)) {
      return {
        status: 'error',
        message:
          'O armazenamento de imagens não está conectado. Ligue um Blob store ao projeto na Vercel.',
      };
    }
    return { status: 'error', message };
  }

  revalidatePath(`/admin/products/${slug}`);
  revalidatePath(`/products/${slug}`);
  return { status: 'success', message: 'Imagem enviada.' };
}

export async function removeProductImageAction(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const denied = await guard();
  if (denied) return { status: 'error', message: denied };

  const mediaId = String(formData.get('mediaId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  if (!mediaId) return { status: 'error', message: 'Imagem não informada.' };

  try {
    const objectKey = await removeProductMedia(mediaId);
    // O registro sai primeiro; se o arquivo não puder ser apagado, o painel já
    // parou de mostrá-lo e sobra apenas um órfão no armazenamento.
    if (objectKey) await del(objectKey).catch(() => undefined);
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Não foi possível remover a imagem.',
    };
  }

  revalidatePath(`/admin/products/${slug}`);
  revalidatePath(`/products/${slug}`);
  return { status: 'success', message: 'Imagem removida.' };
}
