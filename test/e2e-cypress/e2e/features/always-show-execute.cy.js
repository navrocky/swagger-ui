/**
 * @prettier
 */

const specUrl = "url=/documents/petstore.swagger.yaml"
const operation = "#operations-store-getInventory"

describe("alwaysShowExecute", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/store/inventory", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { available: 1 },
    }).as("request")
  })

  it("shows Execute without Try it out and Cancel", () => {
    cy.visit(`/?alwaysShowExecute=true&${specUrl}`)
    cy.get(operation).click()

    cy.get(`${operation} .execute`).should("be.visible")
    cy.get(`${operation} .try-out__btn`).should("not.exist")

    cy.get(`${operation} .execute`).click()
    cy.wait("@request")

    cy.get(`${operation} .live-responses-table`).should("be.visible")
    cy.get(`${operation} .try-out__btn`).should("not.exist")
  })

  it("makes parameters editable right away", () => {
    cy.visit(`/?alwaysShowExecute=true&${specUrl}`)
    cy.get("#operations-pet-getPetById").click()

    cy.get("#operations-pet-getPetById .parameters input")
      .should("not.be.disabled")
      .type("1")
      .should("have.value", "1")
  })

  it("keeps the Try it out toggle when disabled", () => {
    cy.visit(`/?${specUrl}`)
    cy.get(operation).click()

    cy.get(`${operation} .execute`).should("not.exist")
    cy.get(`${operation} .try-out__btn`).should("have.text", "Try it out ")
  })
})
