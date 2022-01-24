import { buildSchema, GraphQLError, parse, validate } from 'graphql'
import createValidation from '..'

describe('Permissions via config', () => {
  test('Set default value for all queries', () => {
    const permissions = {
      Query: {
        '*': 1
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

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
        getAnotherUser {
          name
        }
        alias_1: getAnotherUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])
    expect(errors).toHaveLength(2)
  })

  test('Override default value for specific query call', () => {
    const permissions = {
      Query: {
        '*': 1,
        getAnotherUser: 2
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

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        getAnotherUser {
          name
        }
        alias_1: getAnotherUser {
          name
        }
      }
    `
    const doc = parse(query)
    const errors = validate(schema, doc, [validation])
    expect(errors).toHaveLength(0)
  })
})
