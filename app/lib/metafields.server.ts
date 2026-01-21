/**
 * Metafields Server Utilities
 *
 * GraphQL utilities for reading/writing timer config to shop metafields.
 * This allows the Liquid template to read timer data directly without API calls.
 *
 * Namespace: countdown
 * Key: timers_config
 */

// Metafield constants
export const METAFIELD_NAMESPACE = "countdown";
export const METAFIELD_KEY = "timers_config";

// GraphQL mutation to set metafield
const SET_METAFIELD_MUTATION = `#graphql
  mutation SetTimersMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// GraphQL query to get metafield
const GET_METAFIELD_QUERY = `#graphql
  query GetTimersMetafield($namespace: String!, $key: String!) {
    shop {
      id
      metafield(namespace: $namespace, key: $key) {
        id
        namespace
        key
        value
        type
      }
    }
  }
`;

// GraphQL mutation to delete metafield
const DELETE_METAFIELD_MUTATION = `#graphql
  mutation DeleteMetafield($input: MetafieldDeleteInput!) {
    metafieldDelete(input: $input) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Get timer config from shop metafield
 */
export async function getTimersConfig(admin: any): Promise<any | null> {
  try {
    const response = await admin.graphql(GET_METAFIELD_QUERY, {
      variables: {
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
      },
    });

    const data = await response.json();

    if (data.data?.shop?.metafield?.value) {
      return JSON.parse(data.data.shop.metafield.value);
    }

    return null;
  } catch (error) {
    console.error("Error getting timers config from metafield:", error);
    return null;
  }
}

/**
 * Set timer config to shop metafield
 */
export async function setTimersConfig(
  admin: any,
  config: any
): Promise<boolean> {
  try {
    // First get the shop ID
    const shopResponse = await admin.graphql(`#graphql
      query {
        shop {
          id
        }
      }
    `);
    const shopData = await shopResponse.json();
    const shopId = shopData.data?.shop?.id;

    if (!shopId) {
      console.error("Could not get shop ID");
      return false;
    }

    const response = await admin.graphql(SET_METAFIELD_MUTATION, {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(config),
          },
        ],
      },
    });

    const data = await response.json();

    if (data.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error(
        "Metafield set errors:",
        data.data.metafieldsSet.userErrors
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error setting timers config to metafield:", error);
    return false;
  }
}

/**
 * Delete timer config metafield
 */
export async function deleteTimersConfig(admin: any): Promise<boolean> {
  try {
    // First get the metafield ID
    const getResponse = await admin.graphql(GET_METAFIELD_QUERY, {
      variables: {
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
      },
    });

    const getData = await getResponse.json();
    const metafieldId = getData.data?.shop?.metafield?.id;

    if (!metafieldId) {
      // No metafield to delete
      return true;
    }

    const response = await admin.graphql(DELETE_METAFIELD_MUTATION, {
      variables: {
        input: {
          id: metafieldId,
        },
      },
    });

    const data = await response.json();

    if (data.data?.metafieldDelete?.userErrors?.length > 0) {
      console.error(
        "Metafield delete errors:",
        data.data.metafieldDelete.userErrors
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting timers config metafield:", error);
    return false;
  }
}
