/**
 * @prettier
 */

const specUrl = "url=/documents/petstore.swagger.yaml"
const operation = "#operations-store-getInventory"

describe("Collapsible documented responses", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/store/inventory", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { available: 1 },
    }).as("request")
  })

  it("shows documented responses expanded by default", () => {
    cy.visit(`/?${specUrl}`)
    cy.get(operation).click()

    cy.get(`${operation} .responses-toggle`).should(
      "have.attr",
      "aria-expanded",
      "true"
    )
    cy.get(`${operation} .responses-table`).should("exist")
  })

  it("collapses documented responses with collapseResponses", () => {
    cy.visit(`/?collapseResponses=true&${specUrl}`)
    cy.get(operation).click()

    cy.get(`${operation} .responses-table`).should("not.exist")
    cy.get(`${operation} .responses-codes .response-code`).should(
      "have.text",
      "200"
    )

    cy.get(`${operation} .responses-toggle`).click()
    cy.get(`${operation} .responses-table`).should("exist")
    cy.get(`${operation} .responses-codes`).should("not.exist")

    cy.get(`${operation} .responses-toggle`).click()
    cy.get(`${operation} .responses-table`).should("not.exist")
  })

  it("keeps the server response visible while documented ones are collapsed", () => {
    cy.visit(`/?collapseResponses=true&${specUrl}`)
    cy.get(operation).click()
    cy.get(`${operation} .try-out__btn`).click()
    cy.get(`${operation} .execute`).click()
    cy.wait("@request")

    cy.get(`${operation} .live-responses-table`).should("be.visible")
    cy.get(`${operation} .responses-table:not(.live-responses-table)`).should(
      "not.exist"
    )
    cy.get(`${operation} .responses-codes .response_current`).should(
      "have.text",
      "200"
    )
  })
})
