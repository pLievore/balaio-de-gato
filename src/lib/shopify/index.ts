export { getShop } from './queries/shop';
export { getMenu } from './queries/menus';
export { getCollectionByHandle, getCollections } from './queries/collections';
export {
  getProductByHandle,
  getProducts,
  getRelatedProducts,
  searchProducts,
} from './queries/products';

export { ShopifyStorefrontError, type ShopifyStorefrontErrorCode } from './errors';
