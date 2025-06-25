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
      // Basic search: filter by name containing the query.
      // Contentful's `match` query operator can be used for text search.
      const params = {
        content_type: 'savedLayout',
        order: '-sys.updatedAt',
      };
      if (query.trim()) {
        // This searches the 'name' field. Assumes 'name' is indexed for search.
        params['fields.name[match]'] = query.trim();
      }

      const result = await sdk.space.getEntries(params);
      setLayouts(result.items || []);
    } catch (err) {
      console.error('Error fetching layouts:', err);
      setError('Failed to fetch layouts. See console for details.');
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
      <Heading>Search Saved Layouts</Heading>
      <Paragraph>Find and preview your saved layout structures.</Paragraph>

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
              <Heading as="h3">{layout.fields.name?.[defaultLocale] || 'Unnamed Layout'}</Heading>
              {layout.fields.description && <Paragraph>{layout.fields.description[defaultLocale]}</Paragraph>}
              <Text fontColor="gray500" fontSize="fontSizeS">
                Last updated: {new Date(layout.sys.updatedAt).toLocaleString()}
              </Text>
              <Box marginTop="spacingS">
                <GridPreview gridDefinition={layout.fields.gridDefinition?.[defaultLocale]} defaultLocale={defaultLocale} />
              </Box>
              {/* Add actions like "Edit" or "Use this layout" later */}
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default LayoutSearchPage;
