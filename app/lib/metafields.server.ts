export const METAFIELD_NAMESPACE = "timer_mint";
export const METAFIELD_KEY = "timers_config";

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

const GET_METAFIELD_QUERY = `#graphql
  query GetTimersMetafield($namespace: String!, $key: String!) {
    currentAppInstallation {
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

async function getAppInstallationId(admin: any): Promise<string | null> {
  try {
    const response = await admin.graphql(`#graphql
      query GetCurrentAppInstallation {
        currentAppInstallation {
          id
        }
      }
    `);

    const data = await response.json();
    return data.data?.currentAppInstallation?.id ?? null;
  } catch (error) {
    console.error("Error getting app installation ID:", error);
    return null;
  }
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

async function graphqlJson(admin: any, query: string, variables?: Record<string, unknown>) {
  const response = await admin.graphql(query, variables ? { variables } : undefined);

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new Error(`Shopify GraphQL ${response.status}: ${body || response.statusText}`);
  }

  return response.json();
}

/**
 * Get timer config from shop metafield
 */
export async function getTimersConfig(admin: any): Promise<any | null> {
  try {
    const data = await graphqlJson(admin, GET_METAFIELD_QUERY, {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY,
    });

    if (data.data?.currentAppInstallation?.metafield?.value) {
      return JSON.parse(data.data.currentAppInstallation.metafield.value);
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
    const appInstallationId = await getAppInstallationId(admin);

    if (!appInstallationId) {
      console.error("Could not get app installation ID");
      return false;
    }

    const data = await graphqlJson(admin, SET_METAFIELD_MUTATION, {
      metafields: [
        {
          ownerId: appInstallationId,
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "json",
          value: JSON.stringify(config),
        },
      ],
    });

    if (data.data?.metafieldsSet?.userErrors?.length > 0) {
      console.error("Metafield set errors:", data.data.metafieldsSet.userErrors);
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
    const getData = await graphqlJson(admin, GET_METAFIELD_QUERY, {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY,
    });
    const metafieldId = getData.data?.currentAppInstallation?.metafield?.id;

    if (!metafieldId) {
      return true;
    }

    const data = await graphqlJson(admin, DELETE_METAFIELD_MUTATION, {
      input: {
        id: metafieldId,
      },
    });

    if (data.data?.metafieldDelete?.userErrors?.length > 0) {
      console.error("Metafield delete errors:", data.data.metafieldDelete.userErrors);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting timers config metafield:", error);
    return false;
  }
}
