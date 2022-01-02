# GraphQl No Alias Directive Validation

Graphql validation with accompanying directive to limit the number of `alias` queries and mutations you can use.
It effectively disables batching of queries and mutations.

## Why

It will disable certain kinds of attacks that look like this.

```ts
  // batch query attack (hello DDOS)
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

There are two parts, a `directive` declaration that needs to be added to the schema, and a validation function that needs to be added to the `GraphQl` `validationRules` array.

```js
const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { buildSchema } = require('graphql')

const createValidation = require('graphql-no-alias')

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

The declaration can be used on object `type` or type `fields`. When the declaration is used on the `type` it affects all the fields of that type (Query or Mutation).

#### Object type

In the next example **all** queries will be limited to only **one call**.

```js
const schema = buildSchema(`
  type Query @noAlias {
    getUser: User
    getFriends: [User]!
  }
`)
```

client:

```js
query {
  getUser
  alias_get_user: getUser // Error - validation fails
getFriends
alias_get_friends: getFriends // Error - validation fails
}
```

The directive also accepts one parameter `allow` which declares the default number of allowed aliases.
In the next example, all queries will be allowed to have `3` batch calls

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

#### Field type

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

On the client:

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

The declaration can be customized to have a different name, different default `allow` value, and it can also be passed a custom error function that is executed when the validation fails.

In the next example, `validation` will allow `3` calls to the same field by default, directive name will be changed to `NoBatchCalls`, and there will be a custom error message.

```ts
const { typeDefs, validation } = createValidation(3,'NoBatchCalls',(
  typeName: string,
  fieldName: string,
  maxAllowed: number,
  node: FieldNode,
  ctx: ValidationContext
): GraphQLError {
  return new GraphQLError(
    `Hey! allowed number of calls for ${typeName}->${fieldName} has been exceeded (max: ${maxAllowed})`
  )
}
)
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

### License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details
