/**
 * @prettier
 */

const isInViewport = ($el) => {
  const { top } = $el[0].getBoundingClientRect()
  return top >= 0 && top < $el[0].ownerDocument.defaultView.innerHeight
}

describe("Sidebar navigation", () => {
  describe("when disabled (default)", () => {
    it("does not render the sidebar", () => {
      cy.visit("/?url=/documents/petstore.swagger.yaml")
      cy.get("#operations-tag-pet").should("exist")
      cy.get(".sidebar").should("not.exist")
    })
  })

  describe("when enabled", () => {
    const baseUrl = "/?sidebar=true&url=/documents/petstore.swagger.yaml"

    it("lists tags and operations with method and path", () => {
      cy.visit(baseUrl)
      cy.get(".sidebar .sidebar__group-title")
        .should("have.length", 4)
        .first()
        .should("have.text", "pet")
      cy.get(".sidebar .sidebar__operation")
        .contains(".sidebar__path", "/user/{username}")
        .should("exist")
    })

    it("scrolls the page to the clicked operation", () => {
      cy.visit(baseUrl)
      cy.get("#operations-user-deleteUser").should("exist")
      cy.window().its("scrollY").should("eq", 0)

      cy.get(".sidebar .sidebar__operation").last().click()

      cy.get("#operations-user-deleteUser").should(($el) => {
        expect(isInViewport($el)).to.equal(true)
      })
      cy.window().its("scrollY").should("be.greaterThan", 0)
    })

    it("expands a collapsed tag before scrolling to its operation", () => {
      cy.visit(baseUrl)
      cy.get("#operations-tag-store").click()
      cy.get("#operations-store-getOrderById").should("not.exist")

      cy.get(".sidebar .sidebar__operation")
        .contains(".sidebar__path", "/store/order/{orderId}")
        .first()
        .click()

      cy.get("#operations-store-getOrderById").should(($el) => {
        expect(isInViewport($el)).to.equal(true)
      })
    })

    it("stays pinned and scrolls independently of the page", () => {
      cy.visit(baseUrl)
      cy.get(".sidebar").should("be.visible")
      cy.get(".sidebar-toggle").should("not.be.visible")
      cy.scrollTo("bottom")
      cy.get(".sidebar").should(($el) => {
        expect($el[0].getBoundingClientRect().top).to.be.closeTo(0, 1)
        expect($el.css("overflow-y")).to.equal("auto")
      })
    })
  })

  describe("schemas", () => {
    it("scrolls to a Swagger 2 model", () => {
      cy.visit("/?sidebar=true&url=/documents/petstore.swagger.yaml")
      cy.get("#model-Tag").should("exist")

      cy.get(".sidebar [data-group='schemas'] .sidebar__group-title").should(
        "have.text",
        "Models"
      )
      cy.get(".sidebar .sidebar__operation--schema").contains("Tag").click()

      cy.get("#model-Tag").should(($el) => {
        expect(isInViewport($el)).to.equal(true)
      })
    })

    it("opens a collapsed schemas section before scrolling", () => {
      cy.visit("/?sidebar=true&url=/documents/features/models.openapi.yaml")
      cy.get("section.models .models-control").click()
      cy.get("#model-Pet").should("not.exist")

      cy.get(".sidebar .sidebar__operation--schema").contains("Pet").click()

      cy.get("#model-Pet").should(($el) => {
        expect(isInViewport($el)).to.equal(true)
      })
    })

    it("scrolls to an OpenAPI 3.1 schema", () => {
      cy.visit(
        "/?sidebar=true&url=/documents/features/json-schema-2020-12-title.yaml"
      )
      cy.get("section.models").should("exist")

      cy.get(".sidebar [data-group='schemas'] .sidebar__group-title").should(
        "have.text",
        "Schemas"
      )
      cy.get(".sidebar .sidebar__operation--schema").contains("Error").click()

      cy.get("section.models .json-schema-2020-12[data-json-schema-level='0']")
        .eq(2)
        .should("contain.text", "Error")
        .and(($el) => {
          expect(isInViewport($el)).to.equal(true)
        })
    })

    it("scrolls to a schema in a virtualized OpenAPI 3.1 list", () => {
      cy.visit("/?sidebar=true&url=/documents/perf/many-schemas.openapi31.yaml")
      cy.get("section.models").should("exist")

      cy.get(".sidebar .sidebar__operation--schema")
        .contains("PerfModel200")
        .scrollIntoView()
        .click()

      cy.get("section.models .models-scroll")
        .contains(".json-schema-2020-12-accordion", "PerfModel200", {
          timeout: 10000,
        })
        .should(($el) => {
          expect(isInViewport($el)).to.equal(true)
        })
    })
  })

  describe("on a narrow screen", () => {
    const baseUrl = "/?sidebar=true&url=/documents/petstore.swagger.yaml"

    beforeEach(() => {
      cy.viewport(375, 667)
    })

    it("hides the sidebar behind a menu button", () => {
      cy.visit(baseUrl)
      cy.get("#operations-tag-pet").should("exist")
      cy.get(".sidebar").should("not.be.visible")
      cy.get(".sidebar-toggle").should("be.visible")
    })

    it("opens the sidebar as a floating panel over the page", () => {
      cy.visit(baseUrl)
      cy.get("#operations-tag-pet").should("exist")
      cy.scrollTo(0, 500)

      cy.get(".sidebar-toggle").click()

      cy.get(".sidebar").should("be.visible")
      // Cypress treats fixed elements covered by other fixed elements as
      // hidden, so check the backdrop via its styles instead.
      cy.get(".sidebar-backdrop").should("have.css", "position", "fixed")
      cy.get(".sidebar").should(($el) => {
        const { top, left } = $el[0].getBoundingClientRect()
        expect(top).to.be.closeTo(0, 1)
        expect(left).to.be.closeTo(0, 1)
      })
    })

    it("closes the panel and scrolls when an operation is picked", () => {
      cy.visit(baseUrl)
      cy.get("#operations-user-deleteUser").should("exist")

      cy.get(".sidebar-toggle").click()
      cy.get(".sidebar .sidebar__operation").last().click()

      cy.get(".sidebar").should("not.be.visible")
      cy.get(".sidebar-backdrop").should("not.exist")
      cy.get("#operations-user-deleteUser").should(($el) => {
        expect(isInViewport($el)).to.equal(true)
      })
    })

    it("closes the panel via the backdrop and the close button", () => {
      cy.visit(baseUrl)
      cy.get("#operations-tag-pet").should("exist")

      cy.get(".sidebar-toggle").click()
      cy.get(".sidebar-backdrop").click("right")
      cy.get(".sidebar").should("not.be.visible")

      cy.get(".sidebar-toggle").click()
      cy.get(".sidebar__drawer-close").click()
      cy.get(".sidebar").should("not.be.visible")
    })
  })

  describe("with a virtualized operations list", () => {
    it("scrolls to an operation that is not mounted yet", () => {
      cy.visit("/?sidebar=true&url=/documents/perf/many-operations.yaml")
      cy.get("#operations-tag-perfTag01").should("exist")
      cy.get("#operations-perfTag24-perfOp24_21").should("not.exist")

      cy.get(".sidebar .sidebar__group-title")
        .contains("perfTag24")
        .parents(".sidebar__group")
        .find(".sidebar__operation")
        .eq(20)
        .scrollIntoView()
        .click()

      cy.get("#operations-perfTag24-perfOp24_21", { timeout: 10000 }).should(
        ($el) => {
          expect(isInViewport($el)).to.equal(true)
        }
      )
    })
  })
})
