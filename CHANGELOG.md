# graphql-no-alias

## 2.0.0

### Major Changes

- dc1d95f: Implement imperative configuration

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

- fccb773: Change function signature, make it use a single config object

## 1.0.1

### Patch Changes

- 41eb7c2: update readme
  grammar fix

## 1.0.0

### Major Changes

- 798749a: Initial relase
