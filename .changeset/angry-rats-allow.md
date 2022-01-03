---
'graphql-no-alias': major
---

Implement imperative configuration

With imperative configuration, there is no need for type definition and schema modification.

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
```

When the `permissions` key is passed to configuration, schema directives will be ignored.
