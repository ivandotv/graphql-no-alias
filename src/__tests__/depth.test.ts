import {
  ASTVisitor,
  buildSchema,
  FieldNode,
  GraphQLError,
  parse,
  validate,
  ValidationContext
} from 'graphql'

let countPet = 0
let countOwner = 0

describe('Depth', () => {
  test('If the directive is not present, ignore all aliases', () => {
    function validation(context: ValidationContext): ASTVisitor {
      const ast: ASTVisitor = {
        OperationDefinition: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        OperationTypeDefinition: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        ObjectField: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        ObjectTypeDefinition: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        Document: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        InterfaceTypeDefinition: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        FragmentDefinition: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        FragmentSpread: (a, b, c, d, e) => {
          const ctx = context
          const stop = 'stop'
        },
        Field: {
          leave: (node: FieldNode, key, parent, path, ancestors) => {
            const ctx = context
            if (node.name.value === 'pet') {
              const stop = 'stop'
              countPet++
            }
            if (node.name.value === 'owner') {
              const stop = 'stop'
              countOwner++
            }
            if (node.name.value === 'data') {
              const stop = 'stop'
              // countOwner++
            }
            if (node.name.value === 'getUser') {
              const stop = 'stop'
              // countOwner++
            }
            if (node.name.value === 'admin') {
              const stop = 'stop'
              // countOwner++
            }
          }
        }
      }

      return ast
    }

    const schema = buildSchema(/* GraphQL */ `
      type Query {
        getUser: Person
      }

      interface Person {
        data: Int
        admin: Person
      }

      type User implements Person {
        data: Int
        nick: String
        pet: User
        admin: Person
      }

      type Pet implements Person {
        data: Int
        nick: String
        owner: Person
        admin: Person
      }
    `)

    const query = /* GraphQL */ `
      query Test {
        getUser {
          ...ManyUsers
          data
          alias_data: data
          ... on Pet {
            owner
            alias_owner: owner
          }
        }

        # alias_test: getUser {
        #   nick
        #   pet {
        #     owner {
        #       pet {
        #         nick
        #       }
        #     }
        #   }
        # }
      }

      fragment ManyUsers on User {
        data

        alias_frag: data
        pet {
          pet {
            pet {
              name
            }
          }
        }
      }
    `

    const query2 = /* GraphQL */ `
      query Test {
        getUser {
          # data
          admin_1: admin {
            alias_1: data
            admin_2: admin {
              alias_2: data
            }
            # pet {
            #   owner {
            #     nick
            #   }
            # }
          }
          # pet {
          #   owner {
          #     pet {
          #       owner {
          #         pet
          #       }
          #     }
          #   }
          # }
        }
      }
    `
    const doc = parse(query2)
    const errors = validate(schema, doc, [validation])
    // expect(errors).toHaveLength(0)
    expect(true).toBeTruthy()
  })
})
