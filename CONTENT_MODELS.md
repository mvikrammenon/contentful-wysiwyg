# Content Model Definitions for Wysiwyg Layout Helper

This document outlines the structure of the Contentful content models required for the Wysiwyg Layout Helper app.

## 1. Layout (Internal API ID: `layout`)

This model represents a specific layout instance that can be used on a page. It defines the grid and the components within it, or links to a pre-saved layout with content.

**Fields:**

*   **Name (`name`)**
    *   Type: Symbol (Short Text)
    *   Required: Yes
    *   Description: An internal name to identify this specific layout instance (e.g., "Homepage Main Content Layout").
*   **Grid Definition (`gridDefinition`)**
    *   Type: JSON Object
    *   Required: No (can be populated from `linkedSavedLayoutWithContent`)
    *   Description: Stores the structure of rows, columns, cells, dimensions, and background colors.
    *   JSON Structure Example:
        ```json
        {
          "rows": [
            {
              "id": "row_uuid_1",
              "height": "auto", // or "100px", "20%"
              "backgroundColor": "#FFFFFF",
              "columns": [
                {
                  "id": "col_uuid_1_1",
                  "width": "50%", // or "200px"
                  "backgroundColor": "#EEEEEE",
                  "cells": [
                    {
                      "id": "cell_uuid_1_1_1",
                      "componentConfigId": "entry_id_of_component_config_1" // Link to a ComponentConfiguration entry
                    }
                  ]
                },
                {
                  "id": "col_uuid_1_2",
                  "width": "50%",
                  "cells": [
                    {
                      "id": "cell_uuid_1_2_1",
                      "componentConfigId": "entry_id_of_component_config_2"
                    }
                  ]
                }
              ]
            }
            // ... more rows
          ]
        }
        ```
*   **Linked Saved Layout With Content (`linkedSavedLayoutWithContent`)**
    *   Type: Link (One-to-one)
    *   Allowed Content Types: `savedLayoutWithContent`
    *   Required: No
    *   Description: Optionally links to a "Saved Layout With Content" entry. If set, its `gridDefinition` and associated component configurations can be used as the basis for this layout.

## 2. Component Configuration (Internal API ID: `componentConfiguration`)

This model stores the configuration for a single UI component instance that can be placed within a layout cell.

**Fields:**

*   **Name (`name`)**
    *   Type: Symbol (Short Text)
    *   Required: Yes
    *   Description: An internal name for this specific component configuration (e.g., "Homepage Hero Banner Content").
*   **Component Type (`componentType`)**
    *   Type: Symbol (Short Text)
    *   Required: Yes
    *   Description: An identifier for the type of UI component (e.g., "Card", "Promo", "HeroBanner", "TextBlock"). This helps the front-end rendering application know how to interpret the props and which visual component to use.
*   **Component Properties (`componentProps`)**
    *   Type: JSON Object
    *   Required: No
    *   Description: Additional properties or overrides for the component that are not part of the linked Contentful entry. For example, specific styling options, button text, etc., that are instance-specific.
*   **Linked Contentful Component (`contentfulComponentLink`)**
    *   Type: Link (One-to-one)
    *   Required: No (A component might be purely defined by `componentType` and `componentProps` if it doesn't correspond to an existing generic Contentful entry, though linking is the primary use case for existing components).
    *   Description: A link to an existing Contentful entry that represents the content for this component (e.g., an actual "Promo" entry if `componentType` is "Promo").

## 3. Saved Layout (Internal API ID: `savedLayout`)

This model is for storing reusable layout structures (the grid definition only, without specific content).

**Fields:**

*   **Name (`name`)**
    *   Type: Symbol (Short Text)
    *   Required: Yes
    *   Description: A user-friendly name for this saved layout template (e.g., "Two Column Grid", "Header-Footer-Sidebar Layout").
*   **Description (`description`)**
    *   Type: Text (Long Text)
    *   Required: No
    *   Description: An optional description of the layout structure and its intended use.
*   **Grid Definition (`gridDefinition`)**
    *   Type: JSON Object
    *   Required: Yes
    *   Description: Stores the structure of rows, columns, cells, dimensions, and background colors. Cells in this model **do not** contain `componentConfigId`.
    *   JSON Structure Example (similar to `layout.gridDefinition` but without component links in cells):
        ```json
        {
          "rows": [
            {
              "id": "row_uuid_tpl_1",
              "height": "300px",
              "columns": [
                { "id": "col_uuid_tpl_1_1", "width": "100%" }
              ]
            },
            {
              "id": "row_uuid_tpl_2",
              "height": "auto",
              "columns": [
                { "id": "col_uuid_tpl_2_1", "width": "50%" },
                { "id": "col_uuid_tpl_2_2", "width": "50%" }
              ]
            }
          ]
        }
        ```

## 4. Saved Layout With Content (Internal API ID: `savedLayoutWithContent`)

This model is for storing reusable layouts that include their component configurations, making them complete, ready-to-use sections.

**Fields:**

*   **Name (`name`)**
    *   Type: Symbol (Short Text)
    *   Required: Yes
    *   Description: A user-friendly name for this saved layout with its content (e.g., "January Campaign Homepage Section", "Standard Product Feature Block").
*   **Description (`description`)**
    *   Type: Text (Long Text)
    *   Required: No
    *   Description: An optional description of this saved layout and its content.
*   **Grid Definition (`gridDefinition`)**
    *   Type: JSON Object
    *   Required: Yes
    *   Description: Stores the structure of rows, columns, cells, dimensions, background colors, and references to `ComponentConfiguration` entry IDs within cells. Same structure as `layout.gridDefinition`.
*   **Component Configurations (`componentConfigurations`)**
    *   Type: Link (One-to-many)
    *   Allowed Content Types: `componentConfiguration`
    *   Required: Yes (if `gridDefinition` references any components)
    *   Description: Links to all the `ComponentConfiguration` entries that are used in this saved layout. This allows for easy fetching of all related component data when this saved layout is used.

---

**Note on IDs in JSON (`id` fields for rows, columns, cells):**
These should be unique identifiers (e.g., UUIDs) generated by the app when an element is created. This helps in managing and updating specific parts of the layout.
The `componentConfigId` in the `gridDefinition` of `Layout` and `SavedLayoutWithContent` will be the Contentful entry ID of a `ComponentConfiguration` entry.Tool output for `create_file_with_block`:
