import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LayoutSearchPage from './LayoutSearchPage';
import { mockSdk } from '../../__mocks__/contentfulAppSDK.mock';

// Mock the @contentful/app-sdk
jest.mock('@contentful/app-sdk', () => ({
  __esModule: true,
  useSDK: () => mockSdk,
  SDKProvider: ({ children }) => children,
}));

// Mock uuid used by GridPreview if it were to generate keys, though not strictly necessary
// if GridPreview relies on ids from fetched data. Let's assume it's not needed for now.

describe('LayoutSearchPage', () => {
  beforeEach(() => {
    mockSdk.reset();
    // Specific mock for location.is for this component
    mockSdk.location.is.mockImplementation(locationType => locationType === 'page');
  });

  const mockLayouts = [
    {
      sys: { id: 'layout1', updatedAt: new Date('2023-01-01').toISOString() },
      fields: {
        name: { 'en-US': 'First Test Layout' },
        description: { 'en-US': 'A test description' },
        gridDefinition: {
          'en-US': {
            rows: [{ id: 'r1', height: 'auto', backgroundColor: '#fff', columns: [{id: 'c1', width: '100%', cells: [{id: 'cell1'}]}] }],
          },
        },
      },
    },
    {
      sys: { id: 'layout2', updatedAt: new Date('2023-01-15').toISOString() },
      fields: {
        name: { 'en-US': 'Second Awesome Layout' },
        gridDefinition: {
          'en-US': {
            rows: [{ id: 'r1', height: '100px', columns: [] }],
          },
        },
      },
    },
  ];

  test('renders initial state and fetches layouts', async () => {
    mockSdk.space.getEntries.mockResolvedValueOnce({ items: mockLayouts, total: 2 });
    render(<LayoutSearchPage sdk={mockSdk} />);

    expect(screen.getByRole('heading', { name: /Search Saved Layouts/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Search by Layout Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSdk.space.getEntries).toHaveBeenCalledWith({
        content_type: 'savedLayout',
        order: '-sys.updatedAt',
      });
    });

    expect(await screen.findByText('First Test Layout')).toBeInTheDocument();
    expect(screen.getByText('A test description')).toBeInTheDocument();
    expect(screen.getByText('Second Awesome Layout')).toBeInTheDocument();
  });

  test('displays message when no layouts are found', async () => {
    mockSdk.space.getEntries.mockResolvedValueOnce({ items: [], total: 0 });
    render(<LayoutSearchPage sdk={mockSdk} />);

    expect(await screen.findByText(/No layouts found matching your criteria/i)).toBeInTheDocument();
  });

  test('displays error message on fetch failure', async () => {
    mockSdk.space.getEntries.mockRejectedValueOnce(new Error('Fetch failed'));
    render(<LayoutSearchPage sdk={mockSdk} />);

    expect(await screen.findByText(/Failed to fetch layouts/i)).toBeInTheDocument();
  });

  test('allows searching for layouts', async () => {
    // Initial fetch
    mockSdk.space.getEntries.mockResolvedValueOnce({ items: mockLayouts, total: 2 });
    render(<LayoutSearchPage sdk={mockSdk} />);

    // Wait for initial load
    await screen.findByText('First Test Layout');

    // Search
    const searchInput = screen.getByLabelText(/Search by Layout Name/i);
    const searchButton = screen.getByRole('button', { name: /Search/i });

    mockSdk.space.getEntries.mockResolvedValueOnce({
      items: [mockLayouts[1]], // Assume API returns filtered results
      total: 1
    });
    fireEvent.change(searchInput, { target: { value: 'Awesome' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockSdk.space.getEntries).toHaveBeenCalledWith({
        content_type: 'savedLayout',
        order: '-sys.updatedAt',
        'fields.name[match]': 'Awesome',
      });
    });

    expect(await screen.findByText('Second Awesome Layout')).toBeInTheDocument();
    expect(screen.queryByText('First Test Layout')).not.toBeInTheDocument();
  });

  describe('GridPreview', () => {
    test('renders grid preview for a layout', () => {
      // This test is somewhat implicit as GridPreview is rendered by LayoutSearchPage.
      // We can check for some of its characteristics.
      mockSdk.space.getEntries.mockResolvedValueOnce({ items: [mockLayouts[0]], total: 1 });
      render(<LayoutSearchPage sdk={mockSdk} />);

      // The preview itself is a Box. Check for its existence within the Card.
      // A more direct test of GridPreview would be better.
      const layoutCard = screen.getByText('First Test Layout').closest('div[class*="Card"]'); // Find the Card
      expect(layoutCard).not.toBeNull();
      // Check for a style that GridPreview applies (e.g. border, background)
      // This is brittle. A data-testid on the preview box would be better.
      // For now, just confirm the card renders. A dedicated GridPreview test is better.
    });

    test('GridPreview renders "No grid to display" if gridDefinition is missing/empty', () => {
      const layoutWithNoGrid = {
        sys: { id: 'layout3', updatedAt: new Date().toISOString() },
        fields: {
          name: { 'en-US': 'Layout with No Grid' },
          // No gridDefinition or empty gridDefinition
        },
      };
      mockSdk.space.getEntries.mockResolvedValueOnce({ items: [layoutWithNoGrid], total: 1 });
      render(<LayoutSearchPage sdk={mockSdk} />);

      // This requires GridPreview to render a specific text for empty states.
      // The current GridPreview renders <Paragraph subdued>No grid to display.</Paragraph>
      // Let's look for that text within the card of "Layout with No Grid"
      const card = screen.getByText('Layout with No Grid').closest('div[class*="Card"]');
      expect(within(card).getByText('No grid to display.')).toBeInTheDocument();
    });
  });
});

// Helper to scope queries within an element (useful for Cards, Modals etc.)
// Not strictly necessary if using specific text queries but can be handy.
import { queries, getQueriesForElement } from '@testing-library/dom';
const within = (element) => getQueriesForElement(element, queries);
