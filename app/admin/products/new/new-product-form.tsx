'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, X } from 'lucide-react';

import { resizeImage } from '../image-resize';
import { createProductAction, uploadProductImageAction } from './actions';

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const MAX_IMAGES = 12;

export function NewProductForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<PendingImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('1');

  function addFiles(list: FileList | File[]) {
    const incoming = [...list].filter((file) => /^image\/(jpeg|png|webp)$/.test(file.type));
    setImages((current) => {
      const room = MAX_IMAGES - current.length;
      return [
        ...current,
        ...incoming.slice(0, room).map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
    });
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((image) => image.id !== id);
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const resourceUrls: string[] = [];
      for (let index = 0; index < images.length; index += 1) {
        setProgress(`Uploading photo ${index + 1} of ${images.length}…`);
        const resized = await resizeImage(images[index].file);
        const formData = new FormData();
        formData.append('file', resized);
        const upload = await uploadProductImageAction(formData);
        if (!upload.ok || !upload.resourceUrl) {
          setError(upload.error ?? 'Photo upload failed.');
          return;
        }
        resourceUrls.push(upload.resourceUrl);
      }

      setProgress('Creating the product…');
      const result = await createProductAction({
        title,
        description,
        status,
        price,
        compareAtPrice,
        sku,
        quantity: Number(quantity),
        imageResourceUrls: resourceUrls,
      });
      if (!result.ok) {
        setError(result.error ?? 'The product could not be created.');
        return;
      }

      router.push('/admin/products');
      router.refresh();
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }

  const inputClass =
    'min-h-11 w-full rounded-xl border border-[rgb(var(--border-strong))] bg-white px-4 text-sm outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/15';

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-5 md:p-7">
        <h2 className="text-sm font-bold">Details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="title" className="text-xs font-semibold text-[rgb(var(--muted))]">
              Title *
            </label>
            <input
              id="title"
              required
              maxLength={255}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Harlow 3-Seat Fabric Sofa"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="description" className="text-xs font-semibold text-[rgb(var(--muted))]">
              Description
            </label>
            <textarea
              id="description"
              rows={5}
              maxLength={10000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Condition, dimensions, materials… blank line starts a new paragraph."
              className={`mt-1 ${inputClass} min-h-28 py-3`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="text-xs font-semibold text-[rgb(var(--muted))]">
                Visibility
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value === 'DRAFT' ? 'DRAFT' : 'ACTIVE')}
                className={`mt-1 ${inputClass}`}
              >
                <option value="ACTIVE">Active — visible on the site</option>
                <option value="DRAFT">Draft — hidden for now</option>
              </select>
            </div>
            <div>
              <label htmlFor="sku" className="text-xs font-semibold text-[rgb(var(--muted))]">
                SKU (optional)
              </label>
              <input
                id="sku"
                maxLength={100}
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-5 md:p-7">
        <h2 className="text-sm font-bold">Pricing & stock</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="price" className="text-xs font-semibold text-[rgb(var(--muted))]">
              Price (USD) *
            </label>
            <input
              id="price"
              required
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="899.00"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="compareAt" className="text-xs font-semibold text-[rgb(var(--muted))]">
              Compare-at (optional)
            </label>
            <input
              id="compareAt"
              inputMode="decimal"
              pattern="^\d+(\.\d{1,2})?$"
              value={compareAtPrice}
              onChange={(event) => setCompareAtPrice(event.target.value)}
              placeholder="1499.00"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label htmlFor="quantity" className="text-xs font-semibold text-[rgb(var(--muted))]">
              Stock *
            </label>
            <input
              id="quantity"
              required
              type="number"
              min={0}
              max={100000}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-white p-5 md:p-7">
        <h2 className="text-sm font-bold">
          Photos{' '}
          <span className="font-normal text-[rgb(var(--muted))]">
            ({images.length}/{MAX_IMAGES} — first photo is the cover)
          </span>
        </h2>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`mt-4 flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-sm font-semibold transition ${
            dragging
              ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))]'
              : 'border-[rgb(var(--border-strong))] text-[rgb(var(--muted))] hover:border-[rgb(var(--fg))]'
          }`}
        >
          <ImagePlus aria-hidden="true" className="size-5" />
          Drag photos here or click to choose
          <span className="text-xs font-normal">
            JPEG, PNG or WebP — resized automatically before upload
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = '';
          }}
        />

        {images.length > 0 ? (
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {images.map((image, index) => (
              <li key={image.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img
                  src={image.previewUrl}
                  alt={`Photo ${index + 1}`}
                  className="aspect-square w-full rounded-xl border border-[rgb(var(--border))] object-cover"
                />
                {index === 0 ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    Cover
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label={`Remove photo ${index + 1}`}
                  className="absolute -top-1.5 -right-1.5 inline-flex size-6 items-center justify-center rounded-full bg-[rgb(var(--fg))] text-white transition hover:bg-red-600"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[rgb(var(--fg))] px-6 text-sm font-semibold text-white transition hover:bg-[rgb(var(--fg))]/90 disabled:opacity-60"
        >
          {submitting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {submitting ? (progress ?? 'Working…') : 'Create product'}
        </button>
        <p className="text-xs text-[rgb(var(--muted))]">
          The product is created in Shopify with tracked inventory at your primary location.
        </p>
      </div>
    </form>
  );
}
