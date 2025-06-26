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
  Subheading, // For better sectioning in cell
  SegmentedControl, // For mode switching
} from '@contentful/f36-components';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import tokens from '@contentful/f36-tokens'; // Import tokens
import SlotDefinitionModal from './SlotDefinitionModal'; // Import the new modal

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
  // Mode state: 'designConfiguration' or 'populateLayout'
  const [operatingMode, setOperatingMode] = useState('designConfiguration');

  // State for BentoLayoutConfiguration Design Mode
  const [configurationName, setConfigurationName] = useState('');
  const [description, setDescription] = useState('');
  const [gridDefinitionRows, setGridDefinitionRows] = useState([]);
  const [slotDefinitions, setSlotDefinitions] = useState([]);

  // Modal/UI state for slot definition editor (Design Mode)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [currentEditingCell, setCurrentEditingCell] = useState(null);
  const [currentSlotDetails, setCurrentSlotDetails] = useState({ id: '', label: '', cellId: '', allowedContentTypes: [] });
  const [availableContentTypes, setAvailableContentTypes] = useState([]);

  // Load/Save Modal state (used by both modes, contextually)
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [itemsToListInModal, setItemsToListInModal] = useState([]); // Generic list for modal
  const [loadingError, setLoadingError] = useState(null);
  const [modalTitle, setModalTitle] = useState(''); // Dynamic modal title

  // State for PopulateBentoLayout Mode
  const [selectedBentoConfigForPopulation, setSelectedBentoConfigForPopulation] = useState(null); // Full loaded bento config
  const [currentSlotAssignments, setCurrentSlotAssignments] = useState({}); // { slotId: entryId }
  const [populatedLayoutName, setPopulatedLayoutName] = useState('');
  // We'll also need to store basic info about assigned entries to display in UI
  const [assignedEntryDetails, setAssignedEntryDetails] = useState({}); // { slotId: { name, id, contentTypeId } }


  // Row: { id, height, backgroundColor, columns: [] }
  // Column: { id, width, backgroundColor, cells: [] }
  // Cell: { id } - componentConfigId is removed from here for this editor's purpose

  const addRowToGrid = useCallback(() => { // Renamed from addRow
    setGridDefinitionRows(prevRows => [
      ...prevRows,
      {
        id: `row-${uuidv4()}`,
        height: 'auto',
        backgroundColor: tokens.white, // Using token
        columns: [],
      },
    ]);
  }, []);

  const updateGridRowProperty = useCallback((rowId, property, value) => { // Renamed
    setGridDefinitionRows(prevRows =>
      prevRows.map(row =>
        row.id === rowId ? { ...row, [property]: value } : row
      )
    );
  }, []);

  const addColumnToGridRow = useCallback(rowId => { // Renamed
    setGridDefinitionRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          const newColumn = {
            id: `col-${uuidv4()}`,
            width: `${100 / (row.columns.length + 1)}%`,
            backgroundColor: tokens.gray200, // Using token
            cells: [{ id: `cell-${uuidv4()}` }],
          };
          return { ...row, columns: [...row.columns, newColumn] };
        }
        return row;
      })
    );
  }, []);

  const updateGridColumnProperty = useCallback((rowId, columnId, property, value) => { // Renamed
    setGridDefinitionRows(prevRows =>
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

  const getGridDefinitionForSave = useCallback(() => { // Renamed
    return {
      rows: gridDefinitionRows.map(row => ({
        id: row.id,
        height: row.height,
        backgroundColor: row.backgroundColor,
        columns: row.columns.map(col => ({
          id: col.id,
          width: col.width,
          backgroundColor: col.backgroundColor,
          cells: col.cells.map(cell => ({
            id: cell.id,
          })),
        })),
      })),
    };
  }, [gridDefinitionRows]);

  const handleSaveBentoConfiguration = useCallback(async () => { // Renamed
    if (!configurationName.trim()) {
      app.notifier.error('Please enter a configuration name before saving.');
      return;
    }
    if (gridDefinitionRows.length === 0) {
      app.notifier.error('Cannot save an empty grid. Add rows and columns.');
      return;
    }
    // Later, add validation for slotDefinitions if required (e.g., at least one slot)

    const gridDef = getGridDefinitionForSave();

    try {
      // TODO: In a real scenario, check if we are updating an existing entry or creating a new one.
      // This example always creates a new entry.
      const bentoConfigEntry = await space.createEntry('bentoLayoutConfiguration', {
        fields: {
          name: { [ids.defaultLocale]: configurationName },
          description: { [ids.defaultLocale]: description },
          gridDefinition: { [ids.defaultLocale]: gridDef },
          slotDefinitions: { [ids.defaultLocale]: slotDefinitions }, // Save slot definitions
        },
      });
      app.notifier.success(`Bento Configuration "${configurationName}" saved successfully! Entry ID: ${bentoConfigEntry.sys.id}`);
    } catch (error) {
      console.error('Error saving Bento Configuration:', error);
      app.notifier.error('Failed to save Bento Configuration. Check console for details.');
    }
  }, [configurationName, description, gridDefinitionRows, slotDefinitions, getGridDefinitionForSave, space, ids, app.notifier]);

  const openLoadConfigurationModal = useCallback(async () => { // Renamed
    setLoadingError(null);
    try {
      const result = await space.getEntries({
        content_type: 'bentoLayoutConfiguration', // Target new content type
        order: '-sys.updatedAt',
      });
      if (result.items && result.items.length > 0) {
        setSavedConfigurationsList(result.items); // Use renamed state
      } else {
        setSavedConfigurationsList([]);
        app.notifier.info('No saved Bento Configurations found.');
      }
      setIsLoadModalOpen(true);
    } catch (error)
      console.error('Error fetching Bento Configurations:', error);
      setLoadingError('Failed to fetch Bento Configurations. Check console for details.');
      app.notifier.error('Failed to fetch Bento Configurations.');
      setIsLoadModalOpen(true);
    }
  }, [space, app.notifier]);

  const handleLoadBentoConfiguration = useCallback((entry) => { // Renamed
    const name = entry.fields.name?.[ids.defaultLocale];
    const desc = entry.fields.description?.[ids.defaultLocale];
    const gridDef = entry.fields.gridDefinition?.[ids.defaultLocale];
    const slotsDef = entry.fields.slotDefinitions?.[ids.defaultLocale];

    if (name) {
      setConfigurationName(name + " (copy)"); // Suggest new name for editing
    }
    setDescription(desc || '');
    if (gridDef && gridDef.rows) {
      setGridDefinitionRows(gridDef.rows);
    } else {
      setGridDefinitionRows([]); // Clear grid if not present
    }
    if (slotsDef) {
      setSlotDefinitions(slotsDef);
    } else {
      setSlotDefinitions([]); // Clear slots if not present
    }
    app.notifier.success(`Bento Configuration "${name || 'Unnamed'}" loaded.`);
    setIsLoadModalOpen(false);
  }, [ids.defaultLocale, app.notifier]);


  // Effect to fetch available content types for slot editor
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const result = await space.getContentTypes();
        setAvailableContentTypes(result.items.map(ct => ({ id: ct.sys.id, name: ct.name })));
      } catch (err) {
        console.error("Failed to fetch content types", err);
        app.notifier.error("Could not load content types for slot editor.");
      }
    };
    fetchTypes();
  }, [space, app.notifier]);

  const openSlotModal = useCallback((cellId, existingSlotData = null) => {
    setCurrentEditingCell({ cellId }); // Store which cell is being configured
    setCurrentSlotDetails(existingSlotData || { id: '', label: '', cellId: cellId, allowedContentTypes: [] });
    setIsSlotModalOpen(true);
  }, []);

  const handleSaveSlotDefinition = useCallback((slotData) => {
    setSlotDefinitions(prevSlots => {
      const existingSlotIndex = prevSlots.findIndex(s => s.cellId === slotData.cellId);
      if (existingSlotIndex > -1) {
        // Update existing slot for this cell (if ID changes, it's like replacing)
        // Or if multiple slots per cell were allowed, find by slot.id
        const updatedSlots = [...prevSlots];
        updatedSlots[existingSlotIndex] = slotData;
        return updatedSlots;
      } else {
        // Add new slot, ensuring ID uniqueness if it's a completely new ID not tied to an existing slot being edited
         const idIsUnique = !prevSlots.some(s => s.id === slotData.id);
         if (!idIsUnique && (!currentSlotDetails || currentSlotDetails.id !== slotData.id)) {
            // This check should ideally be more robust or handled inside the modal primarily
            app.notifier.error(`Slot ID "${slotData.id}" is already in use. Please choose a unique ID.`);
            return prevSlots; // Don't update
         }
        return [...prevSlots, slotData];
      }
    });
    setIsSlotModalOpen(false);
  }, [app.notifier, currentSlotDetails]); // Removed setIsSlotModalOpen from here as modal closes itself

  const handleDeleteSlotDefinition = useCallback((slotIdToDelete) => {
    setSlotDefinitions(prevSlots => prevSlots.filter(s => s.id !== slotIdToDelete));
    app.notifier.info(`Slot "${slotIdToDelete}" definition removed.`);
  }, [app.notifier]);

  // --- Functions for Populate Layout Mode ---
  const openLoadModalForPopulation = useCallback(async () => {
    setLoadingError(null);
    setModalTitle("Select Bento Template to Populate");
    try {
      const result = await space.getEntries({ content_type: 'bentoLayoutConfiguration', order: '-sys.updatedAt' });
      setItemsToListInModal(result.items || []);
      if (!result.items || result.items.length === 0) {
        app.notifier.info('No Bento templates (configurations) found.');
      }
      setIsLoadModalOpen(true);
    } catch (error) {
      console.error('Error fetching Bento Configurations for population:', error);
      setLoadingError('Failed to fetch Bento templates. Check console.');
      setItemsToListInModal([]);
      setIsLoadModalOpen(true); // Open to show error
    }
  }, [space, app.notifier]);

  const handleSelectBentoConfigForPopulation = useCallback((configEntry) => {
    setSelectedBentoConfigForPopulation(configEntry);
    // Reset any previous population work for this new template
    setCurrentSlotAssignments({});
    setAssignedEntryDetails({});
    setPopulatedLayoutName(`${configEntry.fields.name[ids.defaultLocale]} - Instance`); // Suggest a name
    setIsLoadModalOpen(false); // Close modal
  }, [ids.defaultLocale]);

  const handleSelectEntryForSlot = useCallback(async (slotDefinition) => {
    try {
      const selectedEntry = await app.dialogs.selectSingleEntry({
        contentTypes: slotDefinition.allowedContentTypes,
      });

      if (selectedEntry) {
        setCurrentSlotAssignments(prev => ({
          ...prev,
          [slotDefinition.id]: selectedEntry.sys.id,
        }));
        // Fetch minimal details of the selected entry for display
        // In a real app, you might want to get this from a shared state or cache if entries are loaded elsewhere
        // For now, just store what the dialog gives, or make a quick fetch if name isn't directly available
        // For simplicity, let's assume selectedEntry has enough info or we fake it for now
        // A proper solution would be to fetch the entry's name field.
        // const entryDetails = await space.getEntry(selectedEntry.sys.id); // This is an extra API call
        // const displayField = entryDetails.fields.name?.[ids.defaultLocale] || entryDetails.fields.title?.[ids.defaultLocale] || 'Unnamed Entry';

        // For now, using a placeholder if name isn't readily available from selectSingleEntry.
        // selectSingleEntry usually returns the full entry object.
        let displayName = 'Selected Entry';
        if (selectedEntry.fields) { // Check if fields are available
            const nameField = Object.keys(selectedEntry.fields).find(f => typeof selectedEntry.fields[f]?.[ids.defaultLocale] === 'string');
            if (nameField) displayName = selectedEntry.fields[nameField][ids.defaultLocale];
        }


        setAssignedEntryDetails(prev => ({
            ...prev,
            [slotDefinition.id]: {
                id: selectedEntry.sys.id,
                name: displayName, // This might need adjustment based on actual returned data structure
                contentTypeId: selectedEntry.sys.contentType.sys.id
            }
        }));

      }
    } catch (error) {
      // Dialog closed or error
      console.info('Error selecting entry for slot or dialog closed:', error);
      // No notification needed if user just cancels dialog
    }
  }, [app.dialogs, ids.defaultLocale, space]);

  const handleSavePopulatedLayout = useCallback(async () => {
    if (!populatedLayoutName.trim()) {
      app.notifier.error('Please enter a name for this populated layout.');
      return;
    }
    if (!selectedBentoConfigForPopulation || Object.keys(currentSlotAssignments).length === 0) {
      app.notifier.error('Please select a Bento template and assign content to at least one slot.');
      return; // Or allow saving with no slots filled if desired
    }

    try {
      const entryToCreate = {
        fields: {
          name: { [ids.defaultLocale]: populatedLayoutName },
          bentoConfiguration: {
            [ids.defaultLocale]: {
              sys: { type: 'Link', linkType: 'Entry', id: selectedBentoConfigForPopulation.sys.id },
            },
          },
          slotAssignments: { [ids.defaultLocale]: currentSlotAssignments },
        },
      };
      const newPopulatedLayout = await space.createEntry('populatedBentoLayout', entryToCreate);
      app.notifier.success(`Populated layout "${populatedLayoutName}" saved successfully! Entry ID: ${newPopulatedLayout.sys.id}`);
      // Reset form or navigate away?
      // For now, just clear name and assignments for next one with same template.
      setPopulatedLayoutName('');
      setCurrentSlotAssignments({});
      setAssignedEntryDetails({});
      // Keep selectedBentoConfigForPopulation if they want to create another instance of the same template.
    } catch (error) {
      console.error('Error saving populated Bento layout:', error);
      app.notifier.error('Failed to save populated layout. Check console.');
    }
  }, [populatedLayoutName, selectedBentoConfigForPopulation, currentSlotAssignments, space, ids, app.notifier]);

  // --- Common Functions / Effects ---
  useEffect(() => { // Fetch content types for Design mode's slot editor
    if (operatingMode === 'designConfiguration') {
      const fetchTypes = async () => {
        try {
          const result = await space.getContentTypes();
          setAvailableContentTypes(result.items.map(ct => ({ id: ct.sys.id, name: ct.name })));
        } catch (err) {
          console.error("Failed to fetch content types", err);
          app.notifier.error("Could not load content types for slot editor.");
        }
      };
      fetchTypes();
    }
  }, [operatingMode, space, app.notifier]);


  // Generic Load Modal Opener for Design Mode (loading a bentoLayoutConfiguration to edit)
  const openLoadModalForDesignMode = useCallback(async () => {
    setLoadingError(null);
    setModalTitle("Load Bento Layout Configuration to Edit");
    try {
      const result = await space.getEntries({ content_type: 'bentoLayoutConfiguration', order: '-sys.updatedAt' });
      setItemsToListInModal(result.items || []);
      if (!result.items || result.items.length === 0) {
        app.notifier.info('No saved Bento Configurations found to edit.');
      }
      setIsLoadModalOpen(true);
    } catch (error) {
      console.error('Error fetching Bento Configurations:', error);
      setLoadingError('Failed to fetch Bento Configurations. Check console.');
      setItemsToListInModal([]);
      setIsLoadModalOpen(true); // Open to show error
    }
  }, [space, app.notifier]);


  return (
    <Box padding="spacingL">
      <Flex justifyContent="space-between" alignItems="center" marginBottom="spacingL">
        <Heading>Layout Editor</Heading>
        <SegmentedControl
          value={operatingMode}
          onChange={setOperatingMode}
        >
          <SegmentedControl.Segment value="designConfiguration">Design Bento Template</SegmentedControl.Segment>
          <SegmentedControl.Segment value="populateLayout">Populate Layout</SegmentedControl.Segment>
        </SegmentedControl>
      </Flex>

      {operatingMode === 'designConfiguration' && (
        <>
          <Heading as="h2" marginTop="spacingL" marginBottom="spacingS">Bento Layout Configuration Editor</Heading>
          <Paragraph>Design your Bento layout templates: define the grid and content slots.</Paragraph>

          <FormControl id="configurationName" marginBottom="spacingM">
            <FormLabel>Configuration Name</FormLabel>
        <TextInput
          value={configurationName}
          onChange={e => setConfigurationName(e.target.value)}
          placeholder="e.g., Homepage Hero Layout"
        />
      </FormControl>
      <FormControl id="configurationDescription" marginBottom="spacingM">
        <FormLabel>Description</FormLabel>
        <TextInput
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description of this Bento template"
        />
      </FormControl>


      <Button onClick={addRowToGrid} marginBottom="spacingM">
        Add Row to Grid
      </Button>
      <Button onClick={openLoadModalForDesignMode} variant="secondary" style={{ marginLeft: '10px' }} marginBottom="spacingM">
        Load Bento Configuration to Edit
      </Button>

      {/* Generic Load Modal is rendered at the bottom of the main return */}
      {/* isLoadModalOpen state will trigger it when set by either openLoadModalForDesignMode or openLoadModalForPopulation */}

      {/* Grid Definition Area - Title this section */}
      <Box marginTop="spacingL" marginBottom="spacingL">
        <Modal onClose={() => setIsLoadModalOpen(false)} isCentered size="medium">
          <ModalConfirmHeader title="Load Bento Layout Configuration" onClose={() => setIsLoadModalOpen(false)} /> {/* Title Change */}
          <ModalContent>
            {loadingError && <Paragraph style={{color: tokens.red500}}>{loadingError}</Paragraph>}
            {!loadingError && savedConfigurationsList.length === 0 && <Paragraph>No saved configurations found.</Paragraph>}
            {!loadingError && savedConfigurationsList.length > 0 && (
              <List>
                {savedConfigurationsList.map(configEntry => ( // Renamed var
                  <ListItem key={configEntry.sys.id}>
                    <TextLink onClick={() => handleLoadBentoConfiguration(configEntry)}> {/* Renamed handler */}
                      {configEntry.fields.name?.[ids.defaultLocale] || 'Unnamed Configuration'}
                      (updated: {new Date(configEntry.sys.updatedAt).toLocaleDateString()})
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

      {/* Grid Definition Area - Title this section */}
      <Box marginTop="spacingL" marginBottom="spacingL">
        <Heading as="h2">Grid Structure</Heading>
        {gridDefinitionRows.map((row, rowIndex) => ( // Renamed var
          <Box key={row.id} style={{ ...rowStyle, backgroundColor: row.backgroundColor }}>
            <Flex justifyContent="space-between" alignItems="center" marginBottom="spacingS">
              <Paragraph>Row {rowIndex + 1}</Paragraph>
              <div>
                <FormControl id={`rowHeight-${row.id}`} style={{display: 'inline-block', marginRight: '10px'}}>
                  <FormLabel>Height</FormLabel>
                  <TextInput
                    value={row.height}
                    onChange={e => updateGridRowProperty(row.id, 'height', e.target.value)} // Renamed
                    width="small"
                    placeholder="auto / 100px / 20%"
                  />
                </FormControl>
                <FormControl id={`rowBgColor-${row.id}`} style={{display: 'inline-block'}}>
                  <FormLabel>BG Color</FormLabel>
                  <TextInput
                    type="color"
                    value={row.backgroundColor}
                    onChange={e => updateGridRowProperty(row.id, 'backgroundColor', e.target.value)} // Renamed
                    width="small"
                  />
                </FormControl>
              </div>
            </Flex>
            <Button
              onClick={() => addColumnToGridRow(row.id)} // Renamed
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
                    width: col.width,
                  }}
                >
                  <Paragraph>Col {colIndex + 1}</Paragraph>
                   <FormControl id={`colWidth-${col.id}`} style={{display: 'inline-block', marginRight: '10px'}}>
                    <FormLabel>Width</FormLabel>
                    <TextInput
                      value={col.width}
                      onChange={e => updateGridColumnProperty(row.id, col.id, 'width', e.target.value)} // Renamed
                      width="small"
                      placeholder="50% / 200px"
                    />
                  </FormControl>
                  <FormControl id={`colBgColor-${col.id}`} style={{display: 'inline-block'}}>
                    <FormLabel>BG Color</FormLabel>
                    <TextInput
                      type="color"
                      value={col.backgroundColor}
                      onChange={e => updateGridColumnProperty(row.id, col.id, 'backgroundColor', e.target.value)} // Renamed
                      width="small"
                    />
                  </FormControl>
                  {col.cells.map((cell, cellIndex) => {
                    const definedSlot = slotDefinitions.find(s => s.cellId === cell.id);
                    return (
                      <Box key={cell.id} style={{...cellStyle, backgroundColor: definedSlot ? tokens.green100 : tokens.gray100}}>
                        <Flex justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Subheading>Cell {cellIndex + 1}</Subheading>
                            <Text fontSize="fontSizeS" fontColor="gray700">ID: {cell.id.substring(0,8)}...</Text>
                          </Box>
                          <Button
                            size="small"
                            variant={definedSlot ? "secondary" : "transparent"}
                            onClick={() => openSlotModal(cell.id, definedSlot)}
                            style={{marginTop: tokens.spacingXs}}
                          >
                            {definedSlot ? "Edit Slot" : "Define Slot"}
                          </Button>
                        </Flex>
                        {definedSlot && (
                          <Box marginTop="spacingS">
                            <Text fontWeight="fontWeightMedium">{definedSlot.label} (Slot ID: {definedSlot.id})</Text>
                            <Text fontSize="fontSizeS">Types: {definedSlot.allowedContentTypes.join(', ') || 'Any'}</Text>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Flex>
          </Box>
        ))}
      </Box>

      <Box marginTop="spacingL" marginBottom="spacingL">
        <Heading as="h2">Defined Slots Overview</Heading>
        {slotDefinitions.length === 0 && <Paragraph subdued>No slots defined yet. Use the "Define Slot" / "Edit Slot" buttons within cells in the grid above.</Paragraph>}
        <List>
          {slotDefinitions.map(slot => (
            <ListItem key={slot.id}>
              <Flex justifyContent="space-between" alignItems="center">
                <Box>
                  <strong>{slot.label}</strong> (ID: {slot.id})
                  <br />
                  <Text fontSize="fontSizeS">
                    Cell: {slot.cellId.substring(0,8)}... | Allowed Types: {slot.allowedContentTypes.join(', ') || 'Any'}
                  </Text>
                </Box>
                <Stack>
                  <Button variant="secondary" size="small" onClick={() => openSlotModal(slot.cellId, slot)}>Edit</Button>
                  <Button variant="negative" size="small" onClick={() => handleDeleteSlotDefinition(slot.id)}>Delete</Button>
                </Stack>
              </Flex>
            </ListItem>
          ))}
        </List>
      </Box>

      {isSlotModalOpen && currentEditingCell && (
        <SlotDefinitionModal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          onSave={handleSaveSlotDefinition}
          initialSlotData={slotDefinitions.find(s => s.cellId === currentEditingCell.cellId) || { cellId: currentEditingCell.cellId, id: '', label: '', allowedContentTypes: [] }}
          cellId={currentEditingCell.cellId}
          availableContentTypes={availableContentTypes}
          existingSlotIds={slotDefinitions
            .map(s => s.id)
            .filter(id => initialSlotData && initialSlotData.id !== id) // Exclude current slot's ID if editing
          }
        />
      )}

      <Box marginTop="spacingL">
        <Button
          variant="positive"
          onClick={handleSaveBentoConfiguration}
          isDisabled={gridDefinitionRows.length === 0 || !configurationName.trim()}
        >
          Save Bento Configuration
        </Button>
      </Box>
        </>
      )}

      {operatingMode === 'populateLayout' && (
        <>
          <Heading as="h2" marginTop="spacingL" marginBottom="spacingS">Populate Bento Layout</Heading>
          <Paragraph>Select a Bento template and fill its content slots.</Paragraph>

          {!selectedBentoConfigForPopulation ? (
            <Button
              variant="primary"
              onClick={() => openLoadModalForPopulation()}
              marginBottom="spacingM"
            >
              Select Bento Template to Populate
            </Button>
          ) : (
            <Box>
              <FormControl id="populatedLayoutName" marginBottom="spacingM">
                <FormLabel>Populated Layout Name</FormLabel>
                <TextInput
                  value={populatedLayoutName}
                  onChange={e => setPopulatedLayoutName(e.target.value)}
                  placeholder="e.g., Homepage Campaign Section"
                />
              </FormControl>

              <Heading as="h3" marginTop="spacingL">Template: {selectedBentoConfigForPopulation.fields.name[ids.defaultLocale]}</Heading>
              <Paragraph>Grid Preview & Slot Assignment:</Paragraph>
              {/* TODO: Display grid (read-only) and slots for population */}
              <Box style={{border: `1px solid ${tokens.gray300}`, padding: tokens.spacingM, backgroundColor: tokens.gray100}}>
                <Paragraph subdued>Grid Preview and Slot Population UI will go here.</Paragraph>
                 {selectedBentoConfigForPopulation.fields.slotDefinitions?.[ids.defaultLocale]?.map(slotDef => (
                  <Box key={slotDef.id} marginBottom="spacingM" padding="spacingS" style={{border: `1px solid ${tokens.gray200}`}}>
                    <FormLabel htmlFor={`slot-${slotDef.id}`}>{slotDef.label} (Slot ID: {slotDef.id})</FormLabel>
                    <HelpText>Allowed: {slotDef.allowedContentTypes.join(', ')}</HelpText>
                    {/* TODO: Display current assignment + button to select/change */}
                     <Button size="small" onClick={() => handleSelectEntryForSlot(slotDef)}>
                        {currentSlotAssignments[slotDef.id] ? "Change Content" : "Assign Content"}
                    </Button>
                    {currentSlotAssignments[slotDef.id] && assignedEntryDetails[slotDef.id] && (
                        <Text>Assigned: {assignedEntryDetails[slotDef.id].name} (ID: {currentSlotAssignments[slotDef.id].substring(0,8)}...)</Text>
                    )}
                  </Box>
                ))}
              </Box>

              <Button
                variant="positive"
                onClick={handleSavePopulatedLayout}
                marginTop="spacingM"
                isDisabled={!populatedLayoutName.trim() || Object.keys(currentSlotAssignments).length === 0} // Basic validation
              >
                Save Populated Layout
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Generic Load Modal */}
      {isLoadModalOpen && (
        <Modal onClose={() => setIsLoadModalOpen(false)} isCentered size="medium">
          <ModalConfirmHeader title={modalTitle} onClose={() => setIsLoadModalOpen(false)} />
          <ModalContent>
            {loadingError && <Paragraph style={{color: tokens.red500}}>{loadingError}</Paragraph>}
            {!loadingError && itemsToListInModal.length === 0 && <Paragraph>No items found.</Paragraph>}
            {!loadingError && itemsToListInModal.length > 0 && (
              <List>
                {itemsToListInModal.map(item => (
                  <ListItem key={item.sys.id}>
                    <TextLink onClick={() => {
                      if (operatingMode === 'designConfiguration') {
                        handleLoadBentoConfiguration(item);
                      } else if (operatingMode === 'populateLayout') {
                        handleSelectBentoConfigForPopulation(item);
                      }
                      setIsLoadModalOpen(false);
                    }}>
                      {item.fields.name?.[ids.defaultLocale] || 'Unnamed Item'}
                      (updated: {new Date(item.sys.updatedAt).toLocaleDateString()})
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

    </Box>
  );
};

export default LayoutEditor;
