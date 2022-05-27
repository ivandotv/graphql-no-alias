# GraphQl No Alias Directive Validation

[![Test](https://github.com/ivandotv/graphql-no-alias/actions/workflows/CI.yml/badge.svg)](https://github.com/ivandotv/graphql-no-alias/actions/workflows/CI.yml)
[![Codecov](https://img.shields.io/codecov/c/gh/ivandotv/graphql-no-alias)](https://app.codecov.io/gh/ivandotv/graphql-no-alias)
[![GitHub license](https://img.shields.io/github/license/ivandotv/graphql-no-alias)](https://github.com/ivandotv/graphql-no-alias/blob/main/LICENSE)

<!-- toc -->

- [Instalation](#instalation)
- [Usage](#usage)
  - [Using the directive](#using-the-directive)
  - [Schema setup](#schema-setup)
    - [Object type usage](#object-type-usage)
    - [Field type usage](#field-type-usage)
  - [Customizing the declaration](#customizing-the-declaration)
  - [Imperative configuration](#imperative-configuration)
  - [Customizing the error message](#customizing-the-error-message)
- [Envelop Plugin](#envelop-plugin)
- [No Batched Queries Library](#no-batched-queries-library)
  - [License](#license)

<!-- tocstop -->

Graphql validation with accompanying directive to limit the number of `alias` queries and mutations that can be sent to the GraphQL server.

It will disable certain kinds of attacks that look like this.

```ts
  // batch query attack (hello DoS)
  query {
    getUsers(first: 1000)
    second: getUsers(first: 2000)
    third: getUsers(first: 3000)
    fourth: getUsers(first: 4000)
  }

  //  or batch login attack
  mutation {
    login(pass: 1111, username: "ivan")
    second: login(pass: 2222, username: "ivan")
    third: login(pass: 3333, username: "ivan")
    fourth: login(pass: 4444, username: "ivan")
  }
`
```

You can read more batching attacks here: https://lab.wallarm.com/graphql-batching-attack/

## Instalation

```sh
npm i graphql-no-alias
```

## Usage

There are two ways to use this validation:

- Using the `directive` in the `schema`
- [Using the configuration options](#Imperative-configuration)(better performance)

### Using the directive

There are two parts, a `@noAlias` directive that needs to be added to the `schema`, and a validation function that needs to be added to the GraphQL server `validationRules` array.
In the example that follows `hello` query will be allowed 2 calls per request, while all the mutations will be limited to 1 call per mutation by setting the `@noAlias` directive directly on the `Mutation` type.

```js
const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')

const { createValidation } = require('graphql-no-alias')

// get the validation function and type definition of the declaration
const { typeDefs, validation } = createValidation()

//add type defintion to schema
const schema = buildSchema(`
  ${typeDefs}
  type Query {
    hello: String @noAlias(allow:2)
  }

  type Mutation @noAlias {
    muteOne(n:Int):String
  }
`)

const app = express()
app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
    validationRules: [validation] //add the validation function
  })
)
app.listen(4000)
```

### Schema setup

The declaration can be used on the object `type` (Query or Mutation) or type `fields` (particular query or mutation). When the declaration is used on the `type` it affects all the fields of that type (Query or Mutation).

#### Object type usage

In the next example **all** queries will be limited to only **one call**.

```js
const schema = buildSchema(`
  type Query @noAlias {
    getUser: User
    getFriends: [User]!
  }
`)
```

client reqeust:

```js
query {
  getUser
  alias_get_user: getUser // Error - validation fails
  getFriends
  alias_get_friends: getFriends // Error - validation fails
}
```

The directive also accepts one parameter `allow` which declares the default number of allowed aliases.
In the next example, all queries will be allowed to have `3` calls (one original, two aliases)

```js
var schema = buildSchema(`
  type Query @noAlias(allow:3) {
    getUser: User
    getFriends: [User]!
  }
`)
```

On the client:

```js
  query {
    getUser
    alias_2: getUser
    alias_3: getUser
    alias_4: getUser // Error - validation fails
  }
```

#### Field type usage

Usage on type fields is the same as on the object type, one difference is that when combined with object directive the one on the field will take precedence.

In the next example, all query fields will be allowed `3` batch calls, except the `getFriends` query, which will be allowed only `1`.

```js
var schema = buildSchema(`
  type Query @noAlias(allow:3) {
    getUser: User
    getFriends: [User]! @noAlias(allow:1) //same as @noAlias
  }
`)
```

client request:

```js
  query {
    getUser
    alias_2: getUser
    alias_3: getUser
	  getFriends
	  alias_1: getFriends // Error - validation fails
  }
```

### Customizing the declaration

The declaration can be customized to have a different name, and different default `allow` values, and it can also be passed a custom error function that is executed when the validation fails.

In the next example, `validation` will allow `3` calls to the same field by default, the directive name will be changed to `NoBatchCalls`, and there will be a custom error message.

```ts
const defaultAllow = 3
const directiveName = 'NoBatchCalls'

const { typeDefs, validation } = createValidation({
  defaultAllow,
  directiveName
})
```

Usage:

```js
const schema = buildSchema(`
  type Query @noBatchCalls {
    getUser: User @noBatchCalls(allow:4)
    getFriends: [User]!
  }
`)
```

### Imperative configuration

With imperative configuration, there is no need for type definition and schema modification. Instead, we use a configuration object.
This results in better performance since the `schema` is not analyzed (not looking for directives).

```ts
const permissions = {
  Query: {
    '*': 2, // default value for all queries
    getAnotherUser: 5 // custom value for specific query
  },
  Mutation: {
    '*': 1 //default value for all mutations
  }
}
const { validation } = createValidation({ permissions })

const schema = buildSchema(/* GraphQL */ `
  type Query {
    getUser: User
    getAnotherUser: User
  }
  type User {
    name: String
  }
`)

const app = express()

app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
    validationRules: [validation] //add the validation function
  })
)
app.listen(4000)
```

Please note that when the `permissions` object is passed to the configuration, schema directives will be ignored.

### Customizing the error message

Continuing from the previous example, the `error` message that is reported when the validation fails can also be customized. You can return a `GrahphQLError` instance or just a `string` that will be used as the error message.

```ts
const { typeDefs, validation } = createValidation({errorFn:(
  typeName: string, //type name Query or Mutation
  fieldName: string,
  maxAllowed: number,
  node: FieldNode,
  ctx: ValidationContext
): GraphQLError {
  return new GraphQLError(
    `Hey! allowed number of calls for ${typeName}->${fieldName} has been exceeded (max: ${maxAllowed})`
  )
  //or return string
  return 'custom message'
}
})
```

## Envelop Plugin

If you are using [GraphQL Envelop](https://www.envelop.dev/). I have made a [plugin](packages/envelop/README.md) that uses this directive.

## No Batched Queries Library

I've also created another validation library: [No batched queries](https://github.com/ivandotv/graphql-no-batched-queries), which limits the number of **all** queries and mutations that could be sent per request. It pairs nicely with this validation, so you could allow for example, 3 queries to be sent and then use `noAlias` directive to disable duplicate queries.

### License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details
