/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontTypes from './storefront.types.js';

export type CartFieldsFragment = Pick<
  StorefrontTypes.Cart,
  'id' | 'checkoutUrl' | 'totalQuantity'
> & {
  cost: {
    subtotalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
    totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
    totalTaxAmount?: StorefrontTypes.Maybe<
      Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
    >;
  };
  discountCodes: Array<Pick<StorefrontTypes.CartDiscountCode, 'code' | 'applicable'>>;
  lines: {
    nodes: Array<
      | (Pick<StorefrontTypes.CartLine, 'id' | 'quantity'> & {
          cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
          merchandise: Pick<
            StorefrontTypes.ProductVariant,
            'id' | 'title' | 'availableForSale' | 'quantityAvailable'
          > & {
            price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
            compareAtPrice?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
            >;
            selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
            image?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
            >;
            product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
          };
        })
      | (Pick<StorefrontTypes.ComponentizableCartLine, 'id' | 'quantity'> & {
          cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
          merchandise: Pick<
            StorefrontTypes.ProductVariant,
            'id' | 'title' | 'availableForSale' | 'quantityAvailable'
          > & {
            price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
            compareAtPrice?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
            >;
            selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
            image?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
            >;
            product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
          };
        })
    >;
  };
};

export type CartQueryVariables = StorefrontTypes.Exact<{
  cartId: StorefrontTypes.Scalars['ID']['input'];
}>;

export type CartQuery = {
  cart?: StorefrontTypes.Maybe<
    Pick<StorefrontTypes.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
      cost: {
        subtotalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        totalTaxAmount?: StorefrontTypes.Maybe<
          Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
        >;
      };
      discountCodes: Array<Pick<StorefrontTypes.CartDiscountCode, 'code' | 'applicable'>>;
      lines: {
        nodes: Array<
          | (Pick<StorefrontTypes.CartLine, 'id' | 'quantity'> & {
              cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
              merchandise: Pick<
                StorefrontTypes.ProductVariant,
                'id' | 'title' | 'availableForSale' | 'quantityAvailable'
              > & {
                price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontTypes.Maybe<
                  Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                image?: StorefrontTypes.Maybe<
                  Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                >;
                product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
              };
            })
          | (Pick<StorefrontTypes.ComponentizableCartLine, 'id' | 'quantity'> & {
              cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
              merchandise: Pick<
                StorefrontTypes.ProductVariant,
                'id' | 'title' | 'availableForSale' | 'quantityAvailable'
              > & {
                price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                compareAtPrice?: StorefrontTypes.Maybe<
                  Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                >;
                selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                image?: StorefrontTypes.Maybe<
                  Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                >;
                product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
              };
            })
        >;
      };
    }
  >;
};

export type CartCreateMutationVariables = StorefrontTypes.Exact<{
  lines?: StorefrontTypes.InputMaybe<
    Array<StorefrontTypes.CartLineInput> | StorefrontTypes.CartLineInput
  >;
}>;

export type CartCreateMutation = {
  cartCreate?: StorefrontTypes.Maybe<{
    cart?: StorefrontTypes.Maybe<
      Pick<StorefrontTypes.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        discountCodes: Array<Pick<StorefrontTypes.CartDiscountCode, 'code' | 'applicable'>>;
        lines: {
          nodes: Array<
            | (Pick<StorefrontTypes.CartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
            | (Pick<StorefrontTypes.ComponentizableCartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
          >;
        };
      }
    >;
    userErrors: Array<Pick<StorefrontTypes.CartUserError, 'field' | 'message' | 'code'>>;
  }>;
};

export type CartAddLinesMutationVariables = StorefrontTypes.Exact<{
  cartId: StorefrontTypes.Scalars['ID']['input'];
  lines: Array<StorefrontTypes.CartLineInput> | StorefrontTypes.CartLineInput;
}>;

export type CartAddLinesMutation = {
  cartLinesAdd?: StorefrontTypes.Maybe<{
    cart?: StorefrontTypes.Maybe<
      Pick<StorefrontTypes.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        discountCodes: Array<Pick<StorefrontTypes.CartDiscountCode, 'code' | 'applicable'>>;
        lines: {
          nodes: Array<
            | (Pick<StorefrontTypes.CartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
            | (Pick<StorefrontTypes.ComponentizableCartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
          >;
        };
      }
    >;
    userErrors: Array<Pick<StorefrontTypes.CartUserError, 'field' | 'message' | 'code'>>;
  }>;
};

export type CartUpdateLinesMutationVariables = StorefrontTypes.Exact<{
  cartId: StorefrontTypes.Scalars['ID']['input'];
  lines: Array<StorefrontTypes.CartLineUpdateInput> | StorefrontTypes.CartLineUpdateInput;
}>;

export type CartUpdateLinesMutation = {
  cartLinesUpdate?: StorefrontTypes.Maybe<{
    cart?: StorefrontTypes.Maybe<
      Pick<StorefrontTypes.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        discountCodes: Array<Pick<StorefrontTypes.CartDiscountCode, 'code' | 'applicable'>>;
        lines: {
          nodes: Array<
            | (Pick<StorefrontTypes.CartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
            | (Pick<StorefrontTypes.ComponentizableCartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
          >;
        };
      }
    >;
    userErrors: Array<Pick<StorefrontTypes.CartUserError, 'field' | 'message' | 'code'>>;
  }>;
};

export type CartRemoveLinesMutationVariables = StorefrontTypes.Exact<{
  cartId: StorefrontTypes.Scalars['ID']['input'];
  lineIds: Array<StorefrontTypes.Scalars['ID']['input']> | StorefrontTypes.Scalars['ID']['input'];
}>;

export type CartRemoveLinesMutation = {
  cartLinesRemove?: StorefrontTypes.Maybe<{
    cart?: StorefrontTypes.Maybe<
      Pick<StorefrontTypes.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        discountCodes: Array<Pick<StorefrontTypes.CartDiscountCode, 'code' | 'applicable'>>;
        lines: {
          nodes: Array<
            | (Pick<StorefrontTypes.CartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
            | (Pick<StorefrontTypes.ComponentizableCartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
          >;
        };
      }
    >;
    userErrors: Array<Pick<StorefrontTypes.CartUserError, 'field' | 'message' | 'code'>>;
  }>;
};

export type CartBuyerIdentityUpdateMutationVariables = StorefrontTypes.Exact<{
  cartId: StorefrontTypes.Scalars['ID']['input'];
  buyerIdentity: StorefrontTypes.CartBuyerIdentityInput;
}>;

export type CartBuyerIdentityUpdateMutation = {
  cartBuyerIdentityUpdate?: StorefrontTypes.Maybe<{
    cart?: StorefrontTypes.Maybe<
      Pick<StorefrontTypes.Cart, 'id' | 'checkoutUrl' | 'totalQuantity'> & {
        cost: {
          subtotalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          totalTaxAmount?: StorefrontTypes.Maybe<
            Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
          >;
        };
        discountCodes: Array<Pick<StorefrontTypes.CartDiscountCode, 'code' | 'applicable'>>;
        lines: {
          nodes: Array<
            | (Pick<StorefrontTypes.CartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
            | (Pick<StorefrontTypes.ComponentizableCartLine, 'id' | 'quantity'> & {
                cost: { totalAmount: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
                merchandise: Pick<
                  StorefrontTypes.ProductVariant,
                  'id' | 'title' | 'availableForSale' | 'quantityAvailable'
                > & {
                  price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
                  compareAtPrice?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
                  image?: StorefrontTypes.Maybe<
                    Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
                  >;
                  product: Pick<StorefrontTypes.Product, 'handle' | 'title'>;
                };
              })
          >;
        };
      }
    >;
    userErrors: Array<Pick<StorefrontTypes.CartUserError, 'field' | 'message' | 'code'>>;
  }>;
};

export type CollectionsQueryVariables = StorefrontTypes.Exact<{
  first: StorefrontTypes.Scalars['Int']['input'];
  after?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
  sortKey?: StorefrontTypes.InputMaybe<StorefrontTypes.CollectionSortKeys>;
  reverse?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Boolean']['input']>;
  query?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
}>;

export type CollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontTypes.Collection, 'id' | 'handle' | 'title' | 'description' | 'updatedAt'> & {
        image?: StorefrontTypes.Maybe<
          Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        seo: Pick<StorefrontTypes.Seo, 'title' | 'description'>;
      }
    >;
    pageInfo: Pick<StorefrontTypes.PageInfo, 'hasNextPage' | 'endCursor'>;
  };
};

export type CollectionByHandleQueryVariables = StorefrontTypes.Exact<{
  handle: StorefrontTypes.Scalars['String']['input'];
  first: StorefrontTypes.Scalars['Int']['input'];
  after?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
}>;

export type CollectionByHandleQuery = {
  collection?: StorefrontTypes.Maybe<
    Pick<StorefrontTypes.Collection, 'id' | 'handle' | 'title' | 'description' | 'updatedAt'> & {
      image?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
      >;
      seo: Pick<StorefrontTypes.Seo, 'title' | 'description'>;
      products: {
        nodes: Array<
          Pick<
            StorefrontTypes.Product,
            'id' | 'handle' | 'title' | 'productType' | 'vendor' | 'tags' | 'availableForSale'
          > & {
            featuredImage?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
            >;
            priceRange: {
              minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
              maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
            };
            compareAtPriceRange: {
              minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
              maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
            };
          }
        >;
        pageInfo: Pick<StorefrontTypes.PageInfo, 'hasNextPage' | 'endCursor'>;
      };
    }
  >;
};

export type MenuQueryVariables = StorefrontTypes.Exact<{
  handle: StorefrontTypes.Scalars['String']['input'];
}>;

export type MenuQuery = {
  menu?: StorefrontTypes.Maybe<
    Pick<StorefrontTypes.Menu, 'id' | 'handle' | 'title'> & {
      items: Array<
        Pick<StorefrontTypes.MenuItem, 'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'> & {
          items: Array<
            Pick<
              StorefrontTypes.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            > & {
              items: Array<
                Pick<
                  StorefrontTypes.MenuItem,
                  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
                >
              >;
            }
          >;
        }
      >;
    }
  >;
};

export type ProductsQueryVariables = StorefrontTypes.Exact<{
  first?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Int']['input']>;
  last?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Int']['input']>;
  after?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
  before?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
  sortKey?: StorefrontTypes.InputMaybe<StorefrontTypes.ProductSortKeys>;
  reverse?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Boolean']['input']>;
  query?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
}>;

export type ProductsQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontTypes.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'description'
        | 'productType'
        | 'vendor'
        | 'tags'
        | 'availableForSale'
        | 'updatedAt'
      > & {
        featuredImage?: StorefrontTypes.Maybe<
          Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        priceRange: {
          minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        };
        options: Array<Pick<StorefrontTypes.ProductOption, 'id' | 'name' | 'values'>>;
        variants: {
          nodes: Array<
            Pick<
              StorefrontTypes.ProductVariant,
              | 'id'
              | 'title'
              | 'sku'
              | 'availableForSale'
              | 'currentlyNotInStock'
              | 'quantityAvailable'
            > & {
              selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
              price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
              compareAtPrice?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
              >;
            }
          >;
        };
      }
    >;
    pageInfo: Pick<
      StorefrontTypes.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'endCursor' | 'startCursor'
    >;
  };
};

export type SearchProductsQueryVariables = StorefrontTypes.Exact<{
  query: StorefrontTypes.Scalars['String']['input'];
  first?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Int']['input']>;
  last?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Int']['input']>;
  after?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
  before?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['String']['input']>;
  sortKey?: StorefrontTypes.InputMaybe<StorefrontTypes.SearchSortKeys>;
  reverse?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Boolean']['input']>;
  productFilters?: StorefrontTypes.InputMaybe<
    Array<StorefrontTypes.ProductFilter> | StorefrontTypes.ProductFilter
  >;
}>;

export type SearchProductsQuery = {
  search: Pick<StorefrontTypes.SearchResultItemConnection, 'totalCount'> & {
    nodes: Array<
      | { __typename: 'Article' | 'Page' }
      | ({ __typename: 'Product' } & Pick<
          StorefrontTypes.Product,
          'id' | 'handle' | 'title' | 'description' | 'productType' | 'vendor' | 'availableForSale'
        > & {
            featuredImage?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
            >;
            priceRange: {
              minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
              maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
            };
            compareAtPriceRange: {
              minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
              maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
            };
          })
    >;
    pageInfo: Pick<
      StorefrontTypes.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'endCursor' | 'startCursor'
    >;
  };
};

export type ProductByHandleQueryVariables = StorefrontTypes.Exact<{
  handle: StorefrontTypes.Scalars['String']['input'];
}>;

export type ProductByHandleQuery = {
  product?: StorefrontTypes.Maybe<
    Pick<
      StorefrontTypes.Product,
      | 'id'
      | 'handle'
      | 'title'
      | 'description'
      | 'descriptionHtml'
      | 'productType'
      | 'vendor'
      | 'tags'
      | 'availableForSale'
      | 'updatedAt'
    > & {
      metafields: Array<StorefrontTypes.Maybe<Pick<StorefrontTypes.Metafield, 'key' | 'value'>>>;
      seo: Pick<StorefrontTypes.Seo, 'title' | 'description'>;
      featuredImage?: StorefrontTypes.Maybe<
        Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
      >;
      priceRange: {
        minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
      };
      compareAtPriceRange: {
        minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
      };
      options: Array<Pick<StorefrontTypes.ProductOption, 'id' | 'name' | 'values'>>;
      media: {
        nodes: Array<
          | (Pick<
              StorefrontTypes.ExternalVideo,
              'embedUrl' | 'host' | 'originUrl' | 'id' | 'alt' | 'mediaContentType'
            > & {
              previewImage?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
            })
          | (Pick<StorefrontTypes.MediaImage, 'id' | 'alt' | 'mediaContentType'> & {
              image?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
              previewImage?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
            })
          | (Pick<StorefrontTypes.Model3d, 'id' | 'alt' | 'mediaContentType'> & {
              previewImage?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
            })
          | (Pick<StorefrontTypes.Video, 'id' | 'alt' | 'mediaContentType'> & {
              sources: Array<
                Pick<
                  StorefrontTypes.VideoSource,
                  'url' | 'mimeType' | 'format' | 'width' | 'height'
                >
              >;
              previewImage?: StorefrontTypes.Maybe<
                Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
              >;
            })
        >;
      };
      variants: {
        nodes: Array<
          Pick<
            StorefrontTypes.ProductVariant,
            | 'id'
            | 'title'
            | 'sku'
            | 'availableForSale'
            | 'currentlyNotInStock'
            | 'quantityAvailable'
          > & {
            selectedOptions: Array<Pick<StorefrontTypes.SelectedOption, 'name' | 'value'>>;
            price: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
            compareAtPrice?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>
            >;
            image?: StorefrontTypes.Maybe<
              Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
            >;
          }
        >;
      };
    }
  >;
};

export type RelatedProductsQueryVariables = StorefrontTypes.Exact<{
  productId: StorefrontTypes.Scalars['ID']['input'];
}>;

export type RelatedProductsQuery = {
  productRecommendations?: StorefrontTypes.Maybe<
    Array<
      Pick<
        StorefrontTypes.Product,
        'id' | 'handle' | 'title' | 'description' | 'productType' | 'vendor' | 'availableForSale'
      > & {
        featuredImage?: StorefrontTypes.Maybe<
          Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        priceRange: {
          minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        };
        compareAtPriceRange: {
          minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
          maxVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        };
      }
    >
  >;
};

export type PredictiveSearchQueryVariables = StorefrontTypes.Exact<{
  query: StorefrontTypes.Scalars['String']['input'];
  limit?: StorefrontTypes.InputMaybe<StorefrontTypes.Scalars['Int']['input']>;
}>;

export type PredictiveSearchQuery = {
  predictiveSearch?: StorefrontTypes.Maybe<{
    queries: Array<Pick<StorefrontTypes.SearchQuerySuggestion, 'text'>>;
    collections: Array<Pick<StorefrontTypes.Collection, 'id' | 'handle' | 'title'>>;
    products: Array<
      Pick<StorefrontTypes.Product, 'id' | 'handle' | 'title' | 'availableForSale'> & {
        featuredImage?: StorefrontTypes.Maybe<
          Pick<StorefrontTypes.Image, 'url' | 'altText' | 'width' | 'height'>
        >;
        priceRange: { minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'> };
        compareAtPriceRange: {
          minVariantPrice: Pick<StorefrontTypes.MoneyV2, 'amount' | 'currencyCode'>;
        };
      }
    >;
  }>;
};

export type ShopQueryVariables = StorefrontTypes.Exact<{ [key: string]: never }>;

export type ShopQuery = {
  shop: Pick<StorefrontTypes.Shop, 'name' | 'description'> & {
    primaryDomain: Pick<StorefrontTypes.Domain, 'host' | 'url'>;
  };
};

interface GeneratedQueryTypes {
  '#graphql\n  query Cart($cartId: ID!) {\n    cart(id: $cartId) {\n      ...CartFields\n    }\n  }\n  #graphql\n  fragment CartFields on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    discountCodes {\n      code\n      applicable\n    }\n    lines(first: 100) {\n      nodes {\n        id\n        quantity\n        cost {\n          totalAmount {\n            amount\n            currencyCode\n          }\n        }\n        merchandise {\n          ... on ProductVariant {\n            id\n            title\n            availableForSale\n            quantityAvailable\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            selectedOptions {\n              name\n              value\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n            product {\n              handle\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n\n': {
    return: CartQuery;
    variables: CartQueryVariables;
  };
  '#graphql\n  query Collections(\n    $first: Int!\n    $after: String\n    $sortKey: CollectionSortKeys = TITLE\n    $reverse: Boolean = false\n    $query: String\n  ) {\n    collections(\n      first: $first\n      after: $after\n      sortKey: $sortKey\n      reverse: $reverse\n      query: $query\n    ) {\n      nodes {\n        id\n        handle\n        title\n        description\n        updatedAt\n        image {\n          url\n          altText\n          width\n          height\n        }\n        seo {\n          title\n          description\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n': {
    return: CollectionsQuery;
    variables: CollectionsQueryVariables;
  };
  '#graphql\n  query CollectionByHandle(\n    $handle: String!\n    $first: Int!\n    $after: String\n  ) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n      updatedAt\n      image {\n        url\n        altText\n        width\n        height\n      }\n      seo {\n        title\n        description\n      }\n      products(first: $first, after: $after) {\n        nodes {\n          id\n          handle\n          title\n          productType\n          vendor\n          tags\n          availableForSale\n          featuredImage {\n            url\n            altText\n            width\n            height\n          }\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n            maxVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n          compareAtPriceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n            maxVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n': {
    return: CollectionByHandleQuery;
    variables: CollectionByHandleQueryVariables;
  };
  '#graphql\n  query Menu($handle: String!) {\n    menu(handle: $handle) {\n      id\n      handle\n      title\n      items {\n        id\n        resourceId\n        tags\n        title\n        type\n        url\n        items {\n          id\n          resourceId\n          tags\n          title\n          type\n          url\n          items {\n            id\n            resourceId\n            tags\n            title\n            type\n            url\n          }\n        }\n      }\n    }\n  }\n': {
    return: MenuQuery;
    variables: MenuQueryVariables;
  };
  '#graphql\n  query Products(\n    $first: Int\n    $last: Int\n    $after: String\n    $before: String\n    $sortKey: ProductSortKeys = CREATED_AT\n    $reverse: Boolean = true\n    $query: String\n  ) {\n    products(\n      first: $first\n      last: $last\n      after: $after\n      before: $before\n      sortKey: $sortKey\n      reverse: $reverse\n      query: $query\n    ) {\n      nodes {\n        id\n        handle\n        title\n        description\n        productType\n        vendor\n        tags\n        availableForSale\n        updatedAt\n        featuredImage {\n          url\n          altText\n          width\n          height\n        }\n        priceRange {\n          minVariantPrice {\n            amount\n            currencyCode\n          }\n          maxVariantPrice {\n            amount\n            currencyCode\n          }\n        }\n        compareAtPriceRange {\n          minVariantPrice {\n            amount\n            currencyCode\n          }\n          maxVariantPrice {\n            amount\n            currencyCode\n          }\n        }\n        options {\n          id\n          name\n          values\n        }\n        variants(first: 100) {\n          nodes {\n            id\n            title\n            sku\n            availableForSale\n            currentlyNotInStock\n            quantityAvailable\n            selectedOptions {\n              name\n              value\n            }\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        endCursor\n        startCursor\n      }\n    }\n  }\n': {
    return: ProductsQuery;
    variables: ProductsQueryVariables;
  };
  '#graphql\n  query SearchProducts(\n    $query: String!\n    $first: Int\n    $last: Int\n    $after: String\n    $before: String\n    $sortKey: SearchSortKeys = RELEVANCE\n    $reverse: Boolean = false\n    $productFilters: [ProductFilter!]\n  ) {\n    search(\n      query: $query\n      first: $first\n      last: $last\n      after: $after\n      before: $before\n      sortKey: $sortKey\n      reverse: $reverse\n      types: [PRODUCT]\n      prefix: LAST\n      unavailableProducts: SHOW\n      productFilters: $productFilters\n    ) {\n      nodes {\n        __typename\n        ... on Product {\n          id\n          handle\n          title\n          description\n          productType\n          vendor\n          availableForSale\n          featuredImage {\n            url\n            altText\n            width\n            height\n          }\n          priceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n            maxVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n          compareAtPriceRange {\n            minVariantPrice {\n              amount\n              currencyCode\n            }\n            maxVariantPrice {\n              amount\n              currencyCode\n            }\n          }\n        }\n      }\n      totalCount\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        endCursor\n        startCursor\n      }\n    }\n  }\n': {
    return: SearchProductsQuery;
    variables: SearchProductsQueryVariables;
  };
  '#graphql\n  query ProductByHandle($handle: String!) {\n    product(handle: $handle) {\n      id\n      handle\n      title\n      description\n      descriptionHtml\n      productType\n      vendor\n      tags\n      availableForSale\n      updatedAt\n      # Hand-maintained attributes (see src/lib/catalog/attributes). They are\n      # only readable here because their definitions grant storefront access.\n      metafields(\n        identifiers: [\n          { namespace: "custom", key: "dimensions" }\n          { namespace: "custom", key: "color" }\n          { namespace: "custom", key: "material" }\n          { namespace: "custom", key: "features" }\n        ]\n      ) {\n        key\n        value\n      }\n      seo {\n        title\n        description\n      }\n      featuredImage {\n        url\n        altText\n        width\n        height\n      }\n      priceRange {\n        minVariantPrice {\n          amount\n          currencyCode\n        }\n        maxVariantPrice {\n          amount\n          currencyCode\n        }\n      }\n      compareAtPriceRange {\n        minVariantPrice {\n          amount\n          currencyCode\n        }\n        maxVariantPrice {\n          amount\n          currencyCode\n        }\n      }\n      options {\n        id\n        name\n        values\n      }\n      media(first: 100) {\n        nodes {\n          id\n          alt\n          mediaContentType\n          previewImage {\n            url\n            altText\n            width\n            height\n          }\n          ... on MediaImage {\n            image {\n              url\n              altText\n              width\n              height\n            }\n          }\n          ... on Video {\n            sources {\n              url\n              mimeType\n              format\n              width\n              height\n            }\n          }\n          ... on ExternalVideo {\n            embedUrl\n            host\n            originUrl\n          }\n        }\n      }\n      variants(first: 100) {\n        nodes {\n          id\n          title\n          sku\n          availableForSale\n          currentlyNotInStock\n          quantityAvailable\n          selectedOptions {\n            name\n            value\n          }\n          price {\n            amount\n            currencyCode\n          }\n          compareAtPrice {\n            amount\n            currencyCode\n          }\n          image {\n            url\n            altText\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n': {
    return: ProductByHandleQuery;
    variables: ProductByHandleQueryVariables;
  };
  '#graphql\n  query RelatedProducts($productId: ID!) {\n    productRecommendations(productId: $productId, intent: RELATED) {\n      id\n      handle\n      title\n      description\n      productType\n      vendor\n      availableForSale\n      featuredImage {\n        url\n        altText\n        width\n        height\n      }\n      priceRange {\n        minVariantPrice {\n          amount\n          currencyCode\n        }\n        maxVariantPrice {\n          amount\n          currencyCode\n        }\n      }\n      compareAtPriceRange {\n        minVariantPrice {\n          amount\n          currencyCode\n        }\n        maxVariantPrice {\n          amount\n          currencyCode\n        }\n      }\n    }\n  }\n': {
    return: RelatedProductsQuery;
    variables: RelatedProductsQueryVariables;
  };
  '#graphql\n  query PredictiveSearch($query: String!, $limit: Int) {\n    predictiveSearch(\n      query: $query\n      limit: $limit\n      limitScope: EACH\n      types: [PRODUCT, COLLECTION, QUERY]\n      unavailableProducts: SHOW\n    ) {\n      queries {\n        text\n      }\n      collections {\n        id\n        handle\n        title\n      }\n      products {\n        id\n        handle\n        title\n        availableForSale\n        featuredImage {\n          url\n          altText\n          width\n          height\n        }\n        priceRange {\n          minVariantPrice {\n            amount\n            currencyCode\n          }\n        }\n        compareAtPriceRange {\n          minVariantPrice {\n            amount\n            currencyCode\n          }\n        }\n      }\n    }\n  }\n': {
    return: PredictiveSearchQuery;
    variables: PredictiveSearchQueryVariables;
  };
  '#graphql\n  query Shop {\n    shop {\n      name\n      description\n      primaryDomain {\n        host\n        url\n      }\n    }\n  }\n': {
    return: ShopQuery;
    variables: ShopQueryVariables;
  };
}

interface GeneratedMutationTypes {
  '#graphql\n  mutation CartCreate($lines: [CartLineInput!]) {\n    cartCreate(input: { lines: $lines }) {\n      cart {\n        ...CartFields\n      }\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n  #graphql\n  fragment CartFields on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    discountCodes {\n      code\n      applicable\n    }\n    lines(first: 100) {\n      nodes {\n        id\n        quantity\n        cost {\n          totalAmount {\n            amount\n            currencyCode\n          }\n        }\n        merchandise {\n          ... on ProductVariant {\n            id\n            title\n            availableForSale\n            quantityAvailable\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            selectedOptions {\n              name\n              value\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n            product {\n              handle\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n\n': {
    return: CartCreateMutation;
    variables: CartCreateMutationVariables;
  };
  '#graphql\n  mutation CartAddLines($cartId: ID!, $lines: [CartLineInput!]!) {\n    cartLinesAdd(cartId: $cartId, lines: $lines) {\n      cart {\n        ...CartFields\n      }\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n  #graphql\n  fragment CartFields on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    discountCodes {\n      code\n      applicable\n    }\n    lines(first: 100) {\n      nodes {\n        id\n        quantity\n        cost {\n          totalAmount {\n            amount\n            currencyCode\n          }\n        }\n        merchandise {\n          ... on ProductVariant {\n            id\n            title\n            availableForSale\n            quantityAvailable\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            selectedOptions {\n              name\n              value\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n            product {\n              handle\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n\n': {
    return: CartAddLinesMutation;
    variables: CartAddLinesMutationVariables;
  };
  '#graphql\n  mutation CartUpdateLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {\n    cartLinesUpdate(cartId: $cartId, lines: $lines) {\n      cart {\n        ...CartFields\n      }\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n  #graphql\n  fragment CartFields on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    discountCodes {\n      code\n      applicable\n    }\n    lines(first: 100) {\n      nodes {\n        id\n        quantity\n        cost {\n          totalAmount {\n            amount\n            currencyCode\n          }\n        }\n        merchandise {\n          ... on ProductVariant {\n            id\n            title\n            availableForSale\n            quantityAvailable\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            selectedOptions {\n              name\n              value\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n            product {\n              handle\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n\n': {
    return: CartUpdateLinesMutation;
    variables: CartUpdateLinesMutationVariables;
  };
  '#graphql\n  mutation CartRemoveLines($cartId: ID!, $lineIds: [ID!]!) {\n    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {\n      cart {\n        ...CartFields\n      }\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n  #graphql\n  fragment CartFields on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    discountCodes {\n      code\n      applicable\n    }\n    lines(first: 100) {\n      nodes {\n        id\n        quantity\n        cost {\n          totalAmount {\n            amount\n            currencyCode\n          }\n        }\n        merchandise {\n          ... on ProductVariant {\n            id\n            title\n            availableForSale\n            quantityAvailable\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            selectedOptions {\n              name\n              value\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n            product {\n              handle\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n\n': {
    return: CartRemoveLinesMutation;
    variables: CartRemoveLinesMutationVariables;
  };
  '#graphql\n  mutation CartBuyerIdentityUpdate(\n    $cartId: ID!\n    $buyerIdentity: CartBuyerIdentityInput!\n  ) {\n    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {\n      cart {\n        ...CartFields\n      }\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n  #graphql\n  fragment CartFields on Cart {\n    id\n    checkoutUrl\n    totalQuantity\n    cost {\n      subtotalAmount {\n        amount\n        currencyCode\n      }\n      totalAmount {\n        amount\n        currencyCode\n      }\n      totalTaxAmount {\n        amount\n        currencyCode\n      }\n    }\n    discountCodes {\n      code\n      applicable\n    }\n    lines(first: 100) {\n      nodes {\n        id\n        quantity\n        cost {\n          totalAmount {\n            amount\n            currencyCode\n          }\n        }\n        merchandise {\n          ... on ProductVariant {\n            id\n            title\n            availableForSale\n            quantityAvailable\n            price {\n              amount\n              currencyCode\n            }\n            compareAtPrice {\n              amount\n              currencyCode\n            }\n            selectedOptions {\n              name\n              value\n            }\n            image {\n              url\n              altText\n              width\n              height\n            }\n            product {\n              handle\n              title\n            }\n          }\n        }\n      }\n    }\n  }\n\n': {
    return: CartBuyerIdentityUpdateMutation;
    variables: CartBuyerIdentityUpdateMutationVariables;
  };
}
declare module '@shopify/storefront-api-client' {
  type InputMaybe<T> = StorefrontTypes.InputMaybe<T>;
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
