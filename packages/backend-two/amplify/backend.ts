import { defineBackend } from "@aws-amplify/backend"
import {
  UserPool,
  UserPoolClient,
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
} from "aws-cdk-lib/aws-cognito"
import { FederatedPrincipal, Role } from "aws-cdk-lib/aws-iam"
import outputs from "backend-one/outputs"

const backend = defineBackend({})
const stack = backend.createStack("Auth")

// reference existing user pool
const userPool = UserPool.fromUserPoolId(
  stack,
  "UserPool",
  outputs.auth.user_pool_id,
)

// but create a new user pool client
const userPoolClient = new UserPoolClient(stack, "UserPoolClient", {
  userPool,
})

// and create a new identity pool with new roles
const identityPool = new CfnIdentityPool(stack, "IdentityPool", {
  allowUnauthenticatedIdentities: true,
  cognitoIdentityProviders: [
    {
      clientId: userPoolClient.userPoolClientId,
      providerName: `cognito-idp.${stack.region}.amazonaws.com/${userPool.userPoolId}`,
    },
  ],
})

// then attach some new roles specific to this app
const authenticatedRole = new Role(stack, "AuthenticatedRole", {
  assumedBy: new FederatedPrincipal(
    "cognito-identity.amazonaws.com",
    {
      StringEquals: {
        "cognito-identity.amazonaws.com:aud": identityPool.attrId,
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "authenticated",
      },
    },
    "sts:AssumeRoleWithWebIdentity",
  ),
})
const unauthenticatedRole = new Role(stack, "UnauthenticatedRole", {
  assumedBy: new FederatedPrincipal(
    "cognito-identity.amazonaws.com",
    {
      StringEquals: {
        "cognito-identity.amazonaws.com:aud": identityPool.attrId,
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "unauthenticated",
      },
    },
    "sts:AssumeRoleWithWebIdentity",
  ),
})

// attach roles to the newly-created identity pool
new CfnIdentityPoolRoleAttachment(stack, "IdentityPoolRoleAttachment", {
  identityPoolId: identityPool.attrId,
  roles: {
    authenticated: authenticatedRole.roleArn,
    unauthenticated: unauthenticatedRole.roleArn,
  },
  roleMappings: {
    UserPoolWebClientRoleMapping: {
      type: "Token",
      ambiguousRoleResolution: "AuthenticatedRole",
      identityProvider: `cognito-idp.${stack.region}.amazonaws.com/${userPool.userPoolId}:${userPoolClient.userPoolClientId}`,
    },
  },
})

backend.addOutput({
  // @ts-expect-error no narrow types from json
  auth: {
    ...outputs.auth,
    user_pool_id: userPool.userPoolId,
    user_pool_client_id: userPoolClient.userPoolClientId,
    identity_pool_id: identityPool.attrId,
  },
})
