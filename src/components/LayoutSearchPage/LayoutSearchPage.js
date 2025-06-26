import React, { useState, useEffect, useCallback } from 'react';
import {
  Heading,
  Paragraph,
  TextInput,
  FormControl,
  FormLabel,
  Box,
  Card,
  Text,
  Stack,
  Spinner,
  Note,
} from '@contentful/f36-components';
import tokens from '@contentful/f36-tokens'; // Import tokens

// Simple preview component for the grid
const GridPreview = ({ gridDefinition, defaultLocale }) => {
  if (!gridDefinition || !gridDefinition.rows || gridDefinition.rows.length === 0) {
    return <Paragraph subdued>No grid to display.</Paragraph>;
  }

  const previewStyle = {
    border: `1px solid ${tokens.gray300}`,
    backgroundColor: tokens.gray100,
    padding: tokens.spacing2Xs,
    height: '120px', // Fixed height for consistency
    overflow: 'hidden',
    position: 'relative',
    borderRadius: tokens.borderRadiusMedium,
  };

  const rowPreviewStyle = (row) => ({
    display: 'flex',
    flexDirection: 'row',
    borderBottom: `1px solid ${tokens.gray400}`,
    backgroundColor: row.backgroundColor || 'transparent',
    // Calculate height proportionally to fit in the preview box, or use a default
    // This is tricky; for simplicity, let's make them somewhat proportional if 'auto'
    height: row.height === 'auto' ? `${100 / gridDefinition.rows.length}%` : row.height,
    minHeight: '10px', // Ensure visibility
  });

  const colPreviewStyle = (col, numCols) => ({
    borderRight: `1px dashed ${tokens.gray500}`,
    backgroundColor: col.backgroundColor || 'transparent',
    // Calculate width proportionally
    width: col.width || `${100 / numCols}%`,
    minWidth: '10px', // Ensure visibility
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    overflow: 'hidden',
  });

  return (
    <Box style={previewStyle}>
      {gridDefinition.rows.map(row => (
        <Box key={row.id} style={rowPreviewStyle(row)}>
          {row.columns.map(col => (
            <Box key={col.id} style={colPreviewStyle(col, row.columns.length)}>
              {/* Cell content could be hinted here if needed */}
            </Box>
          ))}
          {row.columns.length === 0 && <Box style={colPreviewStyle({},1)}><Text subdued>Row (No Cols)</Text></Box>}
        </Box>
      ))}
    </Box>
  );
};


const LayoutSearchPage = ({ sdk }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [layouts, setLayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const defaultLocale = sdk.locales.default;

  useEffect(() => {
    sdk.app.setReady(); // Signal that the page location is ready
  }, [sdk]);

  const fetchLayouts = useCallback(async (query = '') => {
    setIsLoading(true);
    setError(null);
    try {
      // For now, only searching savedLayout. Later, combine with savedLayoutWithContent
      // Search for populatedBentoLayout entries
      // Include the linked bentoLayoutConfiguration to get its name
      const params = {
        content_type: 'populatedBentoLayout',
        order: '-sys.updatedAt',
        include: 1, // Includes linked entries one level deep
      };
      if (query.trim()) {
        params['fields.name[match]'] = query.trim();
      }

      const result = await sdk.space.getEntries(params);

      // Process result to easily access linked bento configuration details
      const populatedLayouts = (result.items || []).map(item => {
        let bentoConfigName = 'Unknown Template';
        const bentoConfigLink = item.fields.bentoConfiguration?.[defaultLocale];
        if (bentoConfigLink && result.includes?.Entry) {
          const linkedConfig = result.includes.Entry.find(entry => entry.sys.id === bentoConfigLink.sys.id);
          if (linkedConfig) {
            bentoConfigName = linkedConfig.fields.name?.[defaultLocale] || 'Unnamed Template';
          }
        }
        return { ...item, bentoConfigName }; // Add resolved name to the item
      });
      setLayouts(populatedLayouts);

    } catch (err) {
      console.error('Error fetching populated layouts:', err);
      setError('Failed to fetch populated layouts. See console for details.');
      setLayouts([]);
    }
    setIsLoading(false);
  }, [sdk.space, defaultLocale]); // defaultLocale removed as it's not directly used in query building here

  useEffect(() => {
    fetchLayouts(); // Initial fetch for all layouts
  }, [fetchLayouts]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLayouts(searchTerm);
  };

  return (
    <Box padding="spacingL">
      <Heading>Search Populated Bento Layouts</Heading>
      <Paragraph>Find your saved instances of Bento layouts.</Paragraph>

      <form onSubmit={handleSearchSubmit}>
        <FormControl id="layoutSearch" marginBottom="spacingM">
          <FormLabel>Search by Layout Name</FormLabel>
          <TextInput
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Enter layout name..."
          />
        </FormControl>
        <Button type="submit" variant="primary" isLoading={isLoading}>Search</Button>
      </form>

      {isLoading && <Spinner marginTop="spacingL" />}
      {error && <Note noteType="negative" title="Error" marginTop="spacingL">{error}</Note>}

      {!isLoading && !error && layouts.length === 0 && (
        <Paragraph marginTop="spacingL">No layouts found matching your criteria.</Paragraph>
      )}

      {!isLoading && !error && layouts.length > 0 && (
        <Stack flexDirection="column" spacing="spacingM" marginTop="spacingL">
          {layouts.map(layout => (
            <Card key={layout.sys.id}>
              <Heading as="h3">{layout.fields.name?.[defaultLocale] || 'Unnamed Populated Layout'}</Heading>
              <Text fontColor="gray700" as="p">
                Using Template: <strong>{layout.bentoConfigName || 'N/A'}</strong>
              </Text>
              {/* We could show slotAssignments count or other details here */}
              {/* For example: <Text>Slots Filled: {Object.keys(layout.fields.slotAssignments?.[defaultLocale] || {}).length}</Text> */}
              <Text fontColor="gray500" fontSize="fontSizeS" marginTop="spacingS">
                Last updated: {new Date(layout.sys.updatedAt).toLocaleString()}
              </Text>
              {/*
                GridPreview is removed for now. To re-enable, we'd need to:
                1. Fetch the linked bentoLayoutConfiguration if not already fully included.
                2. Pass its gridDefinition to GridPreview.
                const bentoConfigLink = layout.fields.bentoConfiguration?.[defaultLocale];
                // ... logic to find full bentoConfig entry from result.includes ...
                // then pass bentoConfig.fields.gridDefinition?.[defaultLocale] to GridPreview
              */}
              {/* Add actions like "Edit" or "View" later */}
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default LayoutSearchPage;
