Cypress.on("uncaught:exception", () => {
  return false
})

// ACCOUNTS & USERS
Cypress.Commands.add("login", (email, password) => {
  cy.visit(`${Cypress.config().baseUrl}/builder`)
  cy.wait(2000)
  cy.url().then(url => {
    if (url.includes("builder/admin")) {
      // create admin user
      cy.get("input").first().type("test@test.com")
      cy.get('input[type="password"]').first().type("test")
      cy.get('input[type="password"]').eq(1).type("test")
      cy.contains("Create super admin user").click({ force: true })
    }
    if (url.includes("builder/auth/login") || url.includes("builder/admin")) {
      // login
      cy.contains("Sign in to Budibase").then(() => {
        if (email == null) {
          cy.get("input").first().type("test@test.com")
          cy.get('input[type="password"]').type("test")
        } else {
          cy.get("input").first().type(email)
          cy.get('input[type="password"]').type(password)
        }
        cy.get("button").first().click({ force: true })
        cy.wait(1000)
      })
    }
  })
})

Cypress.Commands.add("logOut", () => {
  cy.visit(`${Cypress.config().baseUrl}/builder`, { timeout: 2000 })
  cy.get(".user-dropdown .avatar > .icon").click({ force: true })
  cy.get(".spectrum-Popover[data-cy='user-menu']").within(() => {
    cy.get("li[data-cy='user-logout']").click({ force: true })
  })
  cy.wait(2000)
})

Cypress.Commands.add("logoutNoAppGrid", () => {
  // Logs user out when app grid is not present
  cy.visit(`${Cypress.config().baseUrl}/builder`)
  cy.get(".avatar > .icon").click({ force: true })
  cy.get(".spectrum-Popover[data-cy='user-menu']").within(() => {
    cy.get(".spectrum-Menu-item").contains("Log out").click({ force: true })
  })
  cy.wait(2000)
})

Cypress.Commands.add("createUser", email => {
  // quick hacky recorded way to create a user
  cy.contains("Users").click()
  cy.get(`[data-cy="add-user"]`).click()
  cy.get(".spectrum-Dialog-grid").within(() => {
    cy.get(".spectrum-Picker-label").click()
    cy.get(
      ".spectrum-Menu-item:nth-child(2) > .spectrum-Menu-itemLabel"
    ).click()

    // Onboarding type selector
    cy.get(".spectrum-Textfield-input")
      .eq(0)
      .first()
      .type(email, { force: true })
    cy.get(".spectrum-Button--cta").click({ force: true })
  })
})

Cypress.Commands.add("deleteUser", email => {
  // Assumes user has access to Users section
  cy.contains("Users", { timeout: 2000 }).click()
  cy.contains(email).click()

  // Click Delete user button
  cy.get(".spectrum-Button")
    .contains("Delete user")
    .click({ force: true })
    .then(() => {
      // Confirm deletion within modal
      cy.get(".spectrum-Dialog-grid", { timeout: 500 }).within(() => {
        cy.get(".spectrum-Button")
          .contains("Delete user")
          .click({ force: true })
      })
    })
})

Cypress.Commands.add("updateUserInformation", (firstName, lastName) => {
  cy.get(".user-dropdown .avatar > .icon", { timeout: 2000 }).click({
    force: true,
  })

  cy.get(".spectrum-Popover[data-cy='user-menu']").within(() => {
    cy.get("li[data-cy='user-info']").click({ force: true })
  })

  cy.get(".spectrum-Modal.is-open").within(() => {
    cy.get("[data-cy='user-first-name']").clear()

    if (!firstName || firstName == "") {
      cy.get("[data-cy='user-first-name']").invoke("val").should("be.empty")
    } else {
      cy.get("[data-cy='user-first-name']")
        .type(firstName)
        .should("have.value", firstName)
        .blur()
    }

    cy.get("[data-cy='user-last-name']").clear()

    if (!lastName || lastName == "") {
      cy.get("[data-cy='user-last-name']").invoke("val").should("be.empty")
    } else {
      cy.get("[data-cy='user-last-name']")
        .type(lastName)
        .should("have.value", lastName)
        .blur()
    }
    cy.get("button").contains("Update information").click({ force: true })
  })
})

// APPLICATIONS
Cypress.Commands.add("createTestApp", () => {
  const appName = "Cypress Tests"
  cy.deleteApp(appName)
  cy.createApp(appName, "This app is used for Cypress testing.")
})

Cypress.Commands.add("createApp", (name, addDefaultTable) => {
  const shouldCreateDefaultTable =
    typeof addDefaultTable != "boolean" ? true : addDefaultTable

  cy.visit(`${Cypress.config().baseUrl}/builder`, { timeout: 5000 })
  cy.get(`[data-cy="create-app-btn"]`, { timeout: 2000 }).click({ force: true })

  // If apps already exist
  cy.request(`${Cypress.config().baseUrl}/api/applications?status=all`)
    .its("body")
    .then(val => {
      if (val.length > 0) {
        cy.get(`[data-cy="create-app-btn"]`).click({ force: true })
      }
    })

  cy.get(".spectrum-Modal").within(() => {
    cy.get("input").eq(0).should("have.focus")
    if (name && name != "") {
      cy.get("input").eq(0).clear()
      cy.get("input").eq(0).type(name).should("have.value", name).blur()
    }
    cy.get(".spectrum-ButtonGroup")
      .contains("Create app")
      .click({ force: true })
    cy.wait(2000)
  })
  if (shouldCreateDefaultTable) {
    cy.createTable("Cypress Tests", true)
  }
})

Cypress.Commands.add("deleteApp", name => {
  cy.visit(`${Cypress.config().baseUrl}/builder`, { timeout: 5000 })
  cy.wait(2000)
  cy.request(`${Cypress.config().baseUrl}/api/applications?status=all`)
    .its("body")
    .then(val => {
      const findAppName = val.some(val => val.name == name)
      if (findAppName) {
        if (val.length > 0) {
          const appId = val.reduce((acc, app) => {
            if (name === app.name) {
              acc = app.appId
            }
            return acc
          }, "")

          if (appId == "") {
            return
          }

          // Go to app overview
          const appIdParsed = appId.split("_").pop()
          const actionEleId = `[data-cy=row_actions_${appIdParsed}]`
          cy.get(actionEleId).within(() => {
            cy.contains("Manage").click({ force: true })
          })
          cy.wait(500)

          // Unpublish first if needed
          cy.get(`[data-cy="app-status"]`).then($status => {
            if ($status.text().includes("- Unpublish")) {
              // Exact match for Unpublish
              cy.contains("Unpublish").click({ force: true })
              cy.get(".spectrum-Modal").within(() => {
                cy.contains("Unpublish app").click({ force: true })
              })
            }
          })

          // Delete app
          cy.get(".app-overview-actions-icon").within(() => {
            cy.get(".spectrum-Icon").click({ force: true })
          })
          cy.get(".spectrum-Menu").contains("Delete").click()
          cy.get(".spectrum-Dialog-grid").within(() => {
            cy.get("input").type(name)
          })
          cy.get(".spectrum-Button--warning").click()
        } else {
          return
        }
      } else {
        return
      }
    })
})

Cypress.Commands.add("deleteAllApps", () => {
  cy.visit(`${Cypress.config().baseUrl}/builder`)
  cy.wait(500)
  cy.request(`${Cypress.config().baseUrl}/api/applications?status=all`)
    .its("body")
    .then(val => {
      for (let i = 0; i < val.length; i++) {
        cy.deleteApp(val[i].name)
        cy.reload()
      }
    })
})

Cypress.Commands.add("unlockApp", unlock_config => {
  let config = { ...unlock_config }

  cy.get(".spectrum-Modal .spectrum-Dialog[data-cy='app-lock-modal']")
    .should("be.visible")
    .within(() => {
      if (config.owned) {
        cy.get(".spectrum-Dialog-heading").contains("Locked by you")
        cy.get(".lock-expiry-body").contains(
          "This lock will expire in 10 minutes from now"
        )

        cy.intercept("**/lock").as("unlockApp")
        cy.get(".spectrum-Button")
          .contains("Release Lock")
          .click({ force: true })
        cy.wait("@unlockApp")
        cy.get("@unlockApp").its("response.statusCode").should("eq", 200)
        cy.get("@unlockApp").its("response.body").should("deep.equal", {
          message: "Lock released successfully.",
        })
      } else {
        //Show the name ?
        cy.get(".lock-expiry-body").should("not.be.visible")
        cy.get(".spectrum-Button").contains("Done")
      }
    })
})

Cypress.Commands.add("updateAppName", (changedName, noName) => {
  cy.get(".spectrum-Modal").within(() => {
    if (noName == true) {
      cy.get("input").clear()
      cy.get(".spectrum-Dialog-grid")
        .click()
        .contains("App name must be letters, numbers and spaces only")
      return cy
    }
    cy.get("input").clear()
    cy.get("input")
      .eq(0)
      .type(changedName)
      .should("have.value", changedName)
      .blur()
    cy.get(".spectrum-ButtonGroup").contains("Save").click({ force: true })
    cy.wait(500)
  })
})

Cypress.Commands.add("publishApp", resolvedAppPath => {
  //Assumes you have navigated to an application first
  cy.get(".toprightnav button.spectrum-Button")
    .contains("Publish")
    .click({ force: true })

  cy.get(".spectrum-Modal [data-cy='deploy-app-modal']")
    .should("be.visible")
    .within(() => {
      cy.get(".spectrum-Button").contains("Publish").click({ force: true })
      cy.wait(1000)
    })

  //Verify that the app url is presented correctly to the user
  cy.get(".spectrum-Modal [data-cy='deploy-app-success-modal']")
    .should("be.visible")
    .within(() => {
      let appUrl = Cypress.config().baseUrl + "/app/" + resolvedAppPath
      cy.get("[data-cy='deployed-app-url'] input").should("have.value", appUrl)
      cy.get(".spectrum-Button").contains("Done").click({ force: true })
    })
})

Cypress.Commands.add("alterAppVersion", (appId, version) => {
  return cy
    .request("put", `${Cypress.config().baseUrl}/api/applications/${appId}`, {
      version: version || "0.0.1-alpha.0",
    })
    .then(resp => {
      expect(resp.status).to.eq(200)
    })
})

Cypress.Commands.add("importApp", (exportFilePath, name) => {
  cy.visit(`${Cypress.config().baseUrl}/builder`, { timeout: 5000 })

  cy.request(`${Cypress.config().baseUrl}/api/applications?status=all`)
    .its("body")
    .then(val => {
      if (val.length > 0) {
        cy.get(`[data-cy="create-app-btn"]`).click({ force: true })
      }
      cy.wait(500)
      cy.get(`[data-cy="import-app-btn"]`).click({
        force: true,
      })
    })

  cy.get(".spectrum-Modal").within(() => {
    cy.get("input").eq(1).should("have.focus")

    cy.get(".spectrum-Dropzone").selectFile(exportFilePath, {
      action: "drag-drop",
    })

    cy.get(".gallery .filename").contains("exported-app.txt")

    if (name && name != "") {
      cy.get("input").eq(0).type(name).should("have.value", name).blur()
    }
    cy.get(".confirm-wrap button")
      .should("not.be.disabled")
      .click({ force: true })
    cy.wait(3000)
  })
})

// Filters visible with 1 or more
Cypress.Commands.add("searchForApplication", appName => {
  cy.visit(`${Cypress.config().baseUrl}/builder`)
  cy.wait(2000)

  // No app filter functionality if only 1 app exists
  cy.request(`${Cypress.config().baseUrl}/api/applications?status=all`)
    .its("body")
    .then(val => {
      if (val.length < 2) {
        return
      } else {
        // Searches for the app
        cy.get(".filter").then(() => {
          cy.get(".spectrum-Textfield").within(() => {
            cy.get("input").eq(0).clear()
            cy.get("input").eq(0).type(appName)
          })
        })
      }
    })
})

// Assumes there are no others
Cypress.Commands.add("applicationInAppTable", appName => {
  cy.visit(`${Cypress.config().baseUrl}/builder`, { timeout: 10000 })
  cy.get(".appTable", { timeout: 2000 }).within(() => {
    cy.get(".title").contains(appName).should("exist")
  })
})

Cypress.Commands.add("createAppFromScratch", appName => {
  cy.get(`[data-cy="create-app-btn"]`)
    .contains("Start from scratch")
    .click({ force: true })
  cy.get(".spectrum-Modal").within(() => {
    cy.get("input")
      .eq(0)
      .clear()
      .type(appName)
      .should("have.value", appName)
      .blur()
    cy.get(".spectrum-ButtonGroup").contains("Create app").click()
    cy.wait(10000)
  })
  cy.createTable("Cypress Tests", true)
})

// TABLES
Cypress.Commands.add("createTable", (tableName, initialTable) => {
  if (!initialTable) {
    cy.navigateToDataSection()
    cy.get(`[data-cy="new-table"]`).click()
  }
  cy.wait(2000)
  cy.get(".item")
    .contains("Budibase DB")
    .click({ force: true })
    .then(() => {
      cy.get(".spectrum-Button").contains("Continue").click({ force: true })
    })
  cy.get(".spectrum-Modal").within(() => {
    cy.get("input", { timeout: 1000 }).first().type(tableName).blur()
    cy.get(".spectrum-ButtonGroup").contains("Create").click()
  })
  cy.contains(tableName).should("be.visible")
})

Cypress.Commands.add("createTestTableWithData", () => {
  cy.createTable("dog")
  cy.addColumn("dog", "name", "Text")
  cy.addColumn("dog", "age", "Number")
})

Cypress.Commands.add(
  "addColumn",
  (tableName, columnName, type, multiOptions = null) => {
    // Select Table
    cy.selectTable(tableName)
    cy.contains(".nav-item", tableName).click()
    cy.contains("Create column").click()

    // Configure column
    cy.get(".spectrum-Modal").within(() => {
      cy.get("input").first().type(columnName).blur()

      // Unset table display column
      cy.contains("display column").click({ force: true })
      cy.get(".spectrum-Picker-label").click()
      cy.contains(type).click()

      // Add options for Multi-select Type
      if (multiOptions !== null) {
        cy.get(".spectrum-Textfield-input").eq(1).type(multiOptions)
      }

      cy.contains("Save Column").click()
    })
  }
)

Cypress.Commands.add("addRow", values => {
  cy.contains("Create row").click()
  cy.get(".spectrum-Modal").within(() => {
    for (let i = 0; i < values.length; i++) {
      cy.get("input").eq(i).type(values[i]).blur()
    }
    cy.get(".spectrum-ButtonGroup").contains("Create").click()
  })
})

Cypress.Commands.add("addRowMultiValue", values => {
  cy.contains("Create row").click()
  cy.get(".spectrum-Modal").within(() => {
    cy.get(".spectrum-Form-itemField")
      .click()
      .then(() => {
        cy.get(".spectrum-Popover").within(() => {
          for (let i = 0; i < values.length; i++) {
            cy.get(".spectrum-Menu-item").eq(i).click()
          }
        })
        cy.get(".spectrum-Dialog-grid").click("top")
        cy.get(".spectrum-ButtonGroup").contains("Create").click()
      })
  })
})

Cypress.Commands.add("selectTable", tableName => {
  cy.expandBudibaseConnection()
  cy.contains(".nav-item", tableName).click()
})

Cypress.Commands.add("addCustomSourceOptions", totalOptions => {
  cy.get(".spectrum-ActionButton")
    .contains("Define Options")
    .click()
    .then(() => {
      for (let i = 0; i < totalOptions; i++) {
        // Add radio button options
        cy.get(".spectrum-Button")
          .contains("Add Option")
          .click({ force: true })
          .then(() => {
            cy.get("[placeholder='Label']", { timeout: 500 }).eq(i).type(i)
            cy.get("[placeholder='Value']").eq(i).type(i)
          })
      }
      // Save options
      cy.get(".spectrum-Button").contains("Save").click({ force: true })
    })
})

// DESIGN AREA
Cypress.Commands.add("addComponent", (category, component) => {
  if (category) {
    cy.get(`[data-cy="category-${category}"]`, { timeout: 1000 }).click({
      force: true,
    })
  }
  if (component) {
    cy.get(`[data-cy="component-${component}"]`, { timeout: 1000 }).click({
      force: true,
    })
  }
  cy.wait(1000)
  cy.location().then(loc => {
    const params = loc.pathname.split("/")
    const componentId = params[params.length - 1]
    cy.getComponent(componentId).should("exist")
    return cy.wrap(componentId)
  })
})

Cypress.Commands.add("getComponent", componentId => {
  return cy
    .get("iframe")
    .its("0.contentDocument")
    .should("exist")
    .its("body")
    .should("not.be.undefined")
    .then(cy.wrap)
    .find(`[data-id='${componentId}']`)
})

Cypress.Commands.add("createScreen", (route, accessLevelLabel) => {
  // Blank Screen
  cy.contains("Design").click()
  cy.get("[aria-label=AddCircle]").click()
  cy.get(".spectrum-Modal").within(() => {
    cy.get("[data-cy='blank-screen']").click()
    cy.get(".spectrum-Button").contains("Continue").click({ force: true })
  })
  cy.wait(500)
  cy.get(".spectrum-Dialog-grid", { timeout: 500 }).within(() => {
    cy.get(".spectrum-Form-itemField").eq(0).type(route)
    cy.get(".confirm-wrap").contains("Continue").click({ force: true })
  })

  cy.get(".spectrum-Modal", { timeout: 1000 }).within(() => {
    if (accessLevelLabel) {
      cy.get(".spectrum-Picker-label").click()
      cy.wait(500)
      cy.contains(accessLevelLabel).click()
    }
    cy.get(".spectrum-Button").contains("Done").click({ force: true })
  })
})

Cypress.Commands.add(
  "createDatasourceScreen",
  (datasourceNames, accessLevelLabel) => {
    cy.contains("Design").click()
    cy.get("[aria-label=AddCircle]").click()
    cy.get(".spectrum-Modal").within(() => {
      cy.get(".item").contains("Autogenerated screens").click()
      cy.get(".spectrum-Button").contains("Continue").click({ force: true })
    })
    cy.get(".spectrum-Modal [data-cy='data-source-modal']", {
      timeout: 500,
    }).within(() => {
      for (let i = 0; i < datasourceNames.length; i++) {
        cy.wait(500)
        cy.get(".data-source-entry").contains(datasourceNames[i]).click()
        //Ensure the check mark is visible
        cy.get(".data-source-entry")
          .contains(datasourceNames[i])
          .get(".data-source-check")
          .should("exist")
      }

      cy.get(".spectrum-Button").contains("Confirm").click({ force: true })
    })

    cy.get(".spectrum-Modal").within(() => {
      if (accessLevelLabel) {
        cy.get(".spectrum-Picker-label").click()
        cy.wait(500)
        cy.contains(accessLevelLabel).click()
      }
      cy.get(".spectrum-Button").contains("Done").click({ force: true })
    })

    cy.contains("Design").click()
  }
)

Cypress.Commands.add(
  "createAutogeneratedScreens",
  (screenNames, accessLevelLabel) => {
    cy.navigateToAutogeneratedModal()

    for (let i = 0; i < screenNames.length; i++) {
      cy.get(".data-source-entry").contains(screenNames[i]).click()
    }

    cy.get(".spectrum-Modal").within(() => {
      if (accessLevelLabel) {
        cy.get(".spectrum-Picker-label").click()
        cy.wait(500)
        cy.contains(accessLevelLabel).click()
      }
      cy.get(".spectrum-Button").contains("Confirm").click({ force: true })
      cy.wait(4000)
    })
  }
)

// NAVIGATION
Cypress.Commands.add("navigateToFrontend", () => {
  // Clicks on Design tab and then the Home nav item
  cy.wait(500)
  cy.contains("Design").click()
  cy.get(".spectrum-Search").type("/")
  cy.get(".nav-item").contains("home").click()
})

Cypress.Commands.add("navigateToDataSection", () => {
  // Clicks on the Data tab
  cy.wait(500)
  cy.contains("Data").click()
})

Cypress.Commands.add("navigateToAutogeneratedModal", () => {
  // Screen name must already exist within data source
  cy.contains("Design").click()
  cy.get("[aria-label=AddCircle]").click()
  cy.get(".spectrum-Modal").within(() => {
    cy.get(".item").contains("Autogenerated screens").click()
    cy.get(".spectrum-Button").contains("Continue").click({ force: true })
    cy.wait(500)
  })
})

// DATASOURCES
Cypress.Commands.add("selectExternalDatasource", datasourceName => {
  // Navigates to Data Section
  cy.navigateToDataSection()
  // Open Data Source modal
  cy.get(".nav").within(() => {
    cy.get(".add-button").click()
  })
  // Clicks specified datasource & continue
  cy.get(".item-list", { timeout: 1000 }).contains(datasourceName).click()
  cy.get(".spectrum-Dialog-grid").within(() => {
    cy.get(".spectrum-Button").contains("Continue").click({ force: true })
  })
  cy.wait(500)
})

Cypress.Commands.add("addDatasourceConfig", (datasource, skipFetch) => {
  // selectExternalDatasource should be called prior to this
  // Adds the config for specified datasource & fetches tables
  // Currently supports MySQL, PostgreSQL, Oracle
  // Host IP Address
  cy.get(".spectrum-Dialog-grid", { timeout: 500 }).within(() => {
    cy.get(".form-row")
      .eq(0)
      .within(() => {
        cy.get(".spectrum-Textfield").within(() => {
          if (datasource == "Oracle") {
            cy.get("input").clear().type(Cypress.env("oracle").HOST)
          } else {
            cy.get("input")
              .clear({ force: true })
              .type(Cypress.env("HOST_IP"), { force: true })
          }
        })
      })
  })
  // Database Name
  cy.get(".spectrum-Dialog-grid").within(() => {
    if (datasource == "MySQL") {
      cy.get(".form-row")
        .eq(4)
        .within(() => {
          cy.get("input").clear().type(Cypress.env("mysql").DATABASE)
        })
    } else {
      cy.get(".form-row")
        .eq(2)
        .within(() => {
          if (datasource == "PostgreSQL") {
            cy.get("input").clear().type(Cypress.env("postgresql").DATABASE)
          }
          if (datasource == "Oracle") {
            cy.get("input").clear().type(Cypress.env("oracle").DATABASE)
          }
        })
    }
  })
  // User
  cy.get(".spectrum-Dialog-grid").within(() => {
    if (datasource == "MySQL") {
      cy.get(".form-row")
        .eq(2)
        .within(() => {
          cy.get("input").clear().type(Cypress.env("mysql").USER)
        })
    } else {
      cy.get(".form-row")
        .eq(3)
        .within(() => {
          if (datasource == "PostgreSQL") {
            cy.get("input").clear().type(Cypress.env("postgresql").USER)
          }
          if (datasource == "Oracle") {
            cy.get("input").clear().type(Cypress.env("oracle").USER)
          }
        })
    }
  })
  // Password
  cy.get(".spectrum-Dialog-grid").within(() => {
    if (datasource == "MySQL") {
      cy.get(".form-row")
        .eq(3)
        .within(() => {
          cy.get("input").clear().type(Cypress.env("mysql").PASSWORD)
        })
    } else {
      cy.get(".form-row")
        .eq(4)
        .within(() => {
          if (datasource == "PostgreSQL") {
            cy.get("input").clear().type(Cypress.env("postgresql").PASSWORD)
          }
          if (datasource == "Oracle") {
            cy.get("input").clear().type(Cypress.env("oracle").PASSWORD)
          }
        })
    }
  })
  // Click to fetch tables
  if (skipFetch) {
    cy.get(".spectrum-Dialog-grid").within(() => {
      cy.get(".spectrum-Button")
        .contains("Skip table fetch")
        .click({ force: true })
    })
  } else {
    cy.intercept("**/tables").as("datasourceTables")
    cy.get(".spectrum-Dialog-grid").within(() => {
      cy.get(".spectrum-Button")
        .contains("Save and fetch tables")
        .click({ force: true })
    })
    // Wait for tables to be fetched
    cy.wait("@datasourceTables", { timeout: 60000 })
  }
})

Cypress.Commands.add("createRestQuery", (method, restUrl, queryPrettyName) => {
  // addExternalDatasource should be called prior to this
  // Configures REST datasource & sends query
  cy.get(".spectrum-Button", { timeout: 1000 })
    .contains("Add query")
    .click({ force: true })
  // Select Method & add Rest URL
  cy.get(".spectrum-Picker-label").eq(1).click()
  cy.get(".spectrum-Menu").contains(method).click()
  cy.get("input").clear().type(restUrl)
  // Send query
  cy.get(".spectrum-Button").contains("Send").click({ force: true })
  cy.get(".spectrum-Button", { timeout: 500 })
    .contains("Save")
    .click({ force: true })
  cy.get(".hierarchy-items-container")
    .should("contain", method)
    .and("contain", queryPrettyName)
})

// MISC
Cypress.Commands.add("closeModal", () => {
  cy.get(".spectrum-Modal").within(() => {
    cy.get(".close-icon").click()
    cy.wait(1000) // Wait for modal to close
  })
})

Cypress.Commands.add("expandBudibaseConnection", () => {
  if (Cypress.$(".nav-item > .content > .opened").length === 0) {
    // expand the Budibase DB connection string
    cy.get(".icon.arrow").eq(0).click()
  }
})
