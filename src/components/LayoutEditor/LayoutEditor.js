import React, { useState, useCallback } from 'react';
import {
  Heading,
  Paragraph,
  Button,
  TextInput,
  FormControl,
  FormLabel,
  Box,
  FlexLayout as Flex, // Flex is now FlexLayout in f36
  Modal, // For choosing a layout to load
  ModalConfirmHeader,
  ModalControls,
  ModalContent,
  List,
  ListItem,
  TextLink,
} from '@contentful/f36-components';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import tokens from '@contentful/f36-tokens'; // Import tokens

// Styles using Forma 36 tokens
const rowStyle = {
  border: `1px solid ${tokens.gray300}`,
  padding: tokens.spacingM,
  marginBottom: tokens.spacingM,
  minHeight: '50px', // Keep minHeight as is or adjust based on content
  borderRadius: tokens.borderRadiusMedium,
};

const colStyle = {
  border: `1px dashed ${tokens.gray400}`,
  padding: tokens.spacingS,
  margin: tokens.spacingXs,
  minHeight: '40px',
  flexGrow: 1,
  position: 'relative',
  borderRadius: tokens.borderRadiusSmall,
};

const cellStyle = {
  border: `1px dotted ${tokens.gray500}`,
  padding: tokens.spacingXs,
  minHeight: '30px',
  backgroundColor: tokens.gray100, // Lighter background for cells
  borderRadius: tokens.borderRadiusSmall,
};

const LayoutEditor = ({ space, ids, app }) => {
  const [layoutName, setLayoutName] = useState('');
  const [rows, setRows] = useState([]); // Array of row objects
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [savedLayoutsList, setSavedLayoutsList] = useState([]);
  const [loadingError, setLoadingError] = useState(null);

  // Row: { id, height, backgroundColor, columns: [] }
  // Column: { id, width, backgroundColor, cells: [] }
  // Cell: { id, componentConfigId } // componentConfigId will be added later

  const addRow = useCallback(() => {
    setRows(prevRows => [
      ...prevRows,
      {
        id: `row-${uuidv4()}`,
        height: 'auto',
        backgroundColor: '#FFFFFF',
        columns: [],
      },
    ]);
  }, []);

  const updateRowProperty = useCallback((rowId, property, value) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === rowId ? { ...row, [property]: value } : row
      )
    );
  }, []);

  const addColumnToRow = useCallback(rowId => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          const newColumn = {
            id: `col-${uuidv4()}`,
            width: `${100 / (row.columns.length + 1)}%`, // Distribute width
            backgroundColor: '#EEEEEE',
            cells: [{ id: `cell-${uuidv4()}` }], // Each column starts with one cell
          };
          return { ...row, columns: [...row.columns, newColumn] };
        }
        return row;
      })
    );
  }, []);

  const updateColumnProperty = useCallback((rowId, columnId, property, value) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            columns: row.columns.map(col =>
              col.id === columnId ? { ...col, [property]: value } : col
            ),
          };
        }
        return row;
      })
    );
  }, []);

  // Placeholder for updating cell properties later
  // const updateCellProperty = useCallback((rowId, columnId, cellId, property, value) => {...},[])

  const prepareGridDefinitionForSave = useCallback(() => {
    // Strip out any client-side only properties or simplify structure if needed
    // For "SavedLayout" (structure only), we ensure no componentConfigId is present
    return {
      rows: rows.map(row => ({
        id: row.id, // Keep IDs for potential future re-editing of saved layouts
        height: row.height,
        backgroundColor: row.backgroundColor,
        columns: row.columns.map(col => ({
          id: col.id,
          width: col.width,
          backgroundColor: col.backgroundColor,
          cells: col.cells.map(cell => ({
            id: cell.id,
            // No componentConfigId for "SavedLayout"
          })),
        })),
      })),
    };
  }, [rows]);

  const handleSaveLayoutStructure = useCallback(async () => {
    if (!layoutName.trim()) {
      app.notifier.error('Please enter a layout name before saving.');
      return;
    }
    if (rows.length === 0) {
      app.notifier.error('Cannot save an empty layout.');
      return;
    }

    const gridDefinition = prepareGridDefinitionForSave();

    try {
      const savedLayoutEntry = await space.createEntry('savedLayout', {
        fields: {
          name: {
            [ids.defaultLocale]: layoutName,
          },
          gridDefinition: {
            [ids.defaultLocale]: gridDefinition,
          },
          // description field is optional
        },
      });
      app.notifier.success(`Layout structure "${layoutName}" saved successfully! Entry ID: ${savedLayoutEntry.sys.id}`);
      // Potentially clear the editor or offer to start a new layout
    } catch (error) {
      console.error('Error saving layout structure:', error);
      app.notifier.error('Failed to save layout structure. Check console for details.');
    }
  }, [layoutName, rows, prepareGridDefinitionForSave, space, ids, app.notifier]);

  const openLoadModal = useCallback(async () => {
    setLoadingError(null);
    try {
      const result = await space.getEntries({
        content_type: 'savedLayout', // As per CONTENT_MODELS.md
        order: '-sys.updatedAt', // Show most recent first
      });
      if (result.items && result.items.length > 0) {
        setSavedLayoutsList(result.items);
      } else {
        setSavedLayoutsList([]);
        app.notifier.info('No saved layout structures found.');
      }
      setIsLoadModalOpen(true);
    } catch (error) {
      console.error('Error fetching saved layouts:', error);
      setLoadingError('Failed to fetch saved layouts. Check console for details.');
      app.notifier.error('Failed to fetch saved layouts.');
      setIsLoadModalOpen(true); // Open modal to show the error
    }
  }, [space, app.notifier]);

  const handleLoadLayout = useCallback((layoutEntry) => {
    const layoutData = layoutEntry.fields.gridDefinition[ids.defaultLocale];
    if (layoutData && layoutData.rows) {
      // Ensure loaded data has unique IDs if they are not guaranteed to be editor-compatible
      // For now, we assume the saved IDs are fine or regenerate them if needed.
      // This simple load replaces current layout.
      // A more advanced version might ask to merge or clear.
      setRows(layoutData.rows);
      setLayoutName(layoutEntry.fields.name[ids.defaultLocale] + " (copy)"); // Suggest a new name
      app.notifier.success(`Layout "${layoutEntry.fields.name[ids.defaultLocale]}" loaded.`);
    } else {
      app.notifier.error('Selected layout has no grid data.');
    }
    setIsLoadModalOpen(false);
  }, [ids.defaultLocale, app.notifier]);


  return (
    <Box padding="spacingL">
      <Heading>Layout Editor</Heading>
      <Paragraph>Design your layout grid below.</Paragraph>

      <FormControl id="layoutName" marginBottom="spacingM">
        <FormLabel>Layout Name (for saving later)</FormLabel>
        <TextInput
          value={layoutName}
          onChange={e => setLayoutName(e.target.value)}
          placeholder="e.g., Homepage Main Section"
        />
      </FormControl>

      <Button onClick={addRow} marginBottom="spacingM">
        Add Row
      </Button>
      <Button onClick={openLoadModal} variant="secondary" style={{ marginLeft: '10px' }} marginBottom="spacingM">
        Load Layout Structure
      </Button>

      {isLoadModalOpen && (
        <Modal onClose={() => setIsLoadModalOpen(false)} isCentered size="medium">
          <ModalConfirmHeader title="Load Layout Structure" onClose={() => setIsLoadModalOpen(false)} />
          <ModalContent>
            {loadingError && <Paragraph style={{color: 'red'}}>{loadingError}</Paragraph>}
            {!loadingError && savedLayoutsList.length === 0 && <Paragraph>No saved layouts found.</Paragraph>}
            {!loadingError && savedLayoutsList.length > 0 && (
              <List>
                {savedLayoutsList.map(layout => (
                  <ListItem key={layout.sys.id}>
                    <TextLink onClick={() => handleLoadLayout(layout)}>
                      {layout.fields.name[ids.defaultLocale]} (updated: {new Date(layout.sys.updatedAt).toLocaleDateString()})
                    </TextLink>
                  </ListItem>
                ))}
              </List>
            )}
          </ModalContent>
          <ModalControls>
            <Button variant="transparent" onClick={() => setIsLoadModalOpen(false)}>Close</Button>
          </ModalControls>
        </Modal>
      )}

      <Box>
        {rows.map((row, rowIndex) => (
          <Box key={row.id} style={{ ...rowStyle, backgroundColor: row.backgroundColor }}>
            <Flex justifyContent="space-between" alignItems="center" marginBottom="spacingS">
              <Paragraph>Row {rowIndex + 1}</Paragraph>
              <div>
                <FormControl id={`rowHeight-${row.id}`} style={{display: 'inline-block', marginRight: '10px'}}>
                  <FormLabel>Height</FormLabel>
                  <TextInput
                    value={row.height}
                    onChange={e => updateRowProperty(row.id, 'height', e.target.value)}
                    width="small"
                    placeholder="auto / 100px / 20%"
                  />
                </FormControl>
                <FormControl id={`rowBgColor-${row.id}`} style={{display: 'inline-block'}}>
                  <FormLabel>BG Color</FormLabel>
                  <TextInput
                    type="color" // Simple color picker
                    value={row.backgroundColor}
                    onChange={e => updateRowProperty(row.id, 'backgroundColor', e.target.value)}
                    width="small"
                  />
                </FormControl>
              </div>
            </Flex>
            <Button
              onClick={() => addColumnToRow(row.id)}
              size="small"
              marginBottom="spacingS"
            >
              Add Column to Row {rowIndex + 1}
            </Button>
            <Flex style={{ display: 'flex', flexDirection: 'row' }}>
              {row.columns.map((col, colIndex) => (
                <Box
                  key={col.id}
                  style={{
                    ...colStyle,
                    backgroundColor: col.backgroundColor,
                    width: col.width, // Apply width directly
                  }}
                >
                  <Paragraph>Col {colIndex + 1}</Paragraph>
                   <FormControl id={`colWidth-${col.id}`} style={{display: 'inline-block', marginRight: '10px'}}>
                    <FormLabel>Width</FormLabel>
                    <TextInput
                      value={col.width}
                      onChange={e => updateColumnProperty(row.id, col.id, 'width', e.target.value)}
                      width="small"
                      placeholder="50% / 200px"
                    />
                  </FormControl>
                  <FormControl id={`colBgColor-${col.id}`} style={{display: 'inline-block'}}>
                    <FormLabel>BG Color</FormLabel>
                    <TextInput
                      type="color"
                      value={col.backgroundColor}
                      onChange={e => updateColumnProperty(row.id, col.id, 'backgroundColor', e.target.value)}
                      width="small"
                    />
                  </FormControl>
                  {col.cells.map((cell, cellIndex) => (
                    <Box key={cell.id} style={cellStyle}>
                      <Paragraph>Cell {cellIndex + 1}</Paragraph>
                      {/* Placeholder for component selection */}
                      <Paragraph subdued>Component will go here</Paragraph>
                    </Box>
                  ))}
                </Box>
              ))}
            </Flex>
          </Box>
        ))}
      </Box>

      {/* Save buttons will go here later */}
      <Box marginTop="spacingL">
        <Button variant="positive" onClick={handleSaveLayoutStructure} isDisabled={rows.length === 0 || !layoutName.trim()}>
          Save Layout Structure
        </Button>
        <Button variant="primary" style={{ marginLeft: '10px' }} isDisabled>
          Save Layout with Content (Not Implemented)
        </Button>
      </Box>
    </Box>
  );
};

export default LayoutEditor;
