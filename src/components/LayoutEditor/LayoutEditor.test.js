import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LayoutEditor from './LayoutEditor';
import { mockSdk } from '../../__mocks__/contentfulAppSDK.mock';

// Mock the @contentful/app-sdk
jest.mock('@contentful/app-sdk', () => ({
  __esModule: true,
  useSDK: () => mockSdk,
  SDKProvider: ({ children }) => children, // Pass-through for provider
}));

// Mock uuid to return predictable IDs
let idCounter = 0;
jest.mock('uuid', () => ({
  v4: () => {
    idCounter += 1;
    return `uuid-${idCounter}`;
  }
}));

describe('LayoutEditor', () => {
  beforeEach(() => {
    // Reset mocks and idCounter before each test
    mockSdk.reset();
    idCounter = 0;
  });

  test('renders initial state correctly', () => {
    render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

    expect(screen.getByRole('heading', { name: /Layout Editor/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Layout Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Row/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load Layout Structure/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Layout Structure/i })).toBeDisabled();
  });

  test('allows adding a new row', () => {
    render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

    const addRowButton = screen.getByRole('button', { name: /Add Row/i });
    fireEvent.click(addRowButton);

    expect(screen.getByText(/Row 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Column to Row 1/i })).toBeInTheDocument();
  });

  test('allows adding multiple rows', () => {
    render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

    const addRowButton = screen.getByRole('button', { name: /Add Row/i });
    fireEvent.click(addRowButton);
    fireEvent.click(addRowButton);

    expect(screen.getByText(/Row 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Row 2/i)).toBeInTheDocument();
  });

  test('allows adding a column to a row', () => {
    render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

    fireEvent.click(screen.getByRole('button', { name: /Add Row/i }));
    const addColumnButton = screen.getByRole('button', { name: /Add Column to Row 1/i });
    fireEvent.click(addColumnButton);

    // Check for column heading (e.g., "Col 1") and cell placeholder
    expect(screen.getByText(/Col 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Cell 1/i)).toBeInTheDocument(); // From cell placeholder
  });

  test('updates row height property', () => {
    render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Row/i }));

    // Row height input is associated with its FormLabel "Height"
    // Since there might be multiple, we need to be more specific or get all and pick first
    const rowHeightInput = screen.getAllByLabelText('Height')[0];
    fireEvent.change(rowHeightInput, { target: { value: '150px' } });

    expect(rowHeightInput.value).toBe('150px');
    // Further state validation would require exposing state or more complex selectors
  });

  test('updates column width property', () => {
    render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Row/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add Column to Row 1/i }));

    const colWidthInput = screen.getAllByLabelText('Width')[0]; // First column's width input
    fireEvent.change(colWidthInput, { target: { value: '75%' } });

    expect(colWidthInput.value).toBe('75%');
  });

  test('enables save button when layout name and rows are present', () => {
    render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

    const layoutNameInput = screen.getByLabelText(/Layout Name/i);
    fireEvent.change(layoutNameInput, { target: { value: 'My Test Layout' } });

    const addRowButton = screen.getByRole('button', { name: /Add Row/i });
    fireEvent.click(addRowButton);

    expect(screen.getByRole('button', { name: /Save Layout Structure/i })).not.toBeDisabled();
  });

  describe('Save Functionality', () => {
    test('does not save if layout name is missing', async () => {
      render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);
      fireEvent.click(screen.getByRole('button', { name: /Add Row/i }));

      fireEvent.click(screen.getByRole('button', { name: /Save Layout Structure/i }));

      expect(mockSdk.app.notifier.error).toHaveBeenCalledWith('Please enter a layout name before saving.');
      expect(mockSdk.space.createEntry).not.toHaveBeenCalled();
    });

    test('does not save if there are no rows', async () => {
      render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);
      fireEvent.change(screen.getByLabelText(/Layout Name/i), { target: { value: 'No Rows Layout' } });

      fireEvent.click(screen.getByRole('button', { name: /Save Layout Structure/i }));

      expect(mockSdk.app.notifier.error).toHaveBeenCalledWith('Cannot save an empty layout.');
      expect(mockSdk.space.createEntry).not.toHaveBeenCalled();
    });

    test('calls createEntry with correct data on successful save', async () => {
      render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

      fireEvent.change(screen.getByLabelText(/Layout Name/i), { target: { value: 'My Saved Layout' } });
      fireEvent.click(screen.getByRole('button', { name: /Add Row/i })); // Adds row uuid-1
      fireEvent.click(screen.getByRole('button', { name: /Add Column to Row 1/i })); // Adds col uuid-2, cell uuid-3

      const expectedGridDefinition = {
        rows: [
          {
            id: 'uuid-1',
            height: 'auto',
            backgroundColor: '#FFFFFF',
            columns: [
              {
                id: 'uuid-2',
                width: '100%', // Default for first column
                backgroundColor: '#EEEEEE',
                cells: [{ id: 'uuid-3' }],
              },
            ],
          },
        ],
      };

      mockSdk.space.createEntry.mockResolvedValueOnce({ sys: {id: 'newEntryId' }}); // Simulate successful creation

      fireEvent.click(screen.getByRole('button', { name: /Save Layout Structure/i }));

      await waitFor(() => {
        expect(mockSdk.space.createEntry).toHaveBeenCalledWith('savedLayout', {
          fields: {
            name: { 'en-US': 'My Saved Layout' },
            gridDefinition: { 'en-US': expectedGridDefinition },
          },
        });
      });
      await waitFor(() => {
        expect(mockSdk.app.notifier.success).toHaveBeenCalledWith(expect.stringContaining('My Saved Layout" saved successfully!'));
      });
    });
  });

  describe('Load Functionality', () => {
    const mockSavedLayouts = [
      {
        sys: { id: 'layout1', updatedAt: new Date().toISOString() },
        fields: {
          name: { 'en-US': 'Loaded Layout 1' },
          gridDefinition: {
            'en-US': {
              rows: [{ id: 'r1', height: '200px', backgroundColor: '#DDDDDD', columns: [] }],
            },
          },
        },
      },
    ];

    test('opens load modal and fetches layouts', async () => {
      mockSdk.space.getEntries.mockResolvedValueOnce({ items: mockSavedLayouts, total: 1 });
      render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

      fireEvent.click(screen.getByRole('button', { name: /Load Layout Structure/i }));

      await waitFor(() => {
        expect(mockSdk.space.getEntries).toHaveBeenCalledWith({
          content_type: 'savedLayout',
          order: '-sys.updatedAt',
        });
      });
      expect(await screen.findByText(/Load Layout Structure/i)).toBeInTheDocument(); // Modal title
      expect(await screen.findByText(/Loaded Layout 1/i)).toBeInTheDocument(); // Layout name in modal list
    });

    test('loads selected layout into editor', async () => {
      mockSdk.space.getEntries.mockResolvedValueOnce({ items: mockSavedLayouts, total: 1 });
      render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

      fireEvent.click(screen.getByRole('button', { name: /Load Layout Structure/i }));

      const layoutToLoadLink = await screen.findByText(/Loaded Layout 1/i);
      fireEvent.click(layoutToLoadLink);

      await waitFor(() => {
        expect(screen.getByLabelText(/Layout Name/i).value).toBe('Loaded Layout 1 (copy)');
      });
      expect(screen.getByText(/Row 1/i)).toBeInTheDocument(); // Check if row from loaded layout is rendered
      // Check specific properties of the loaded row/column if necessary
      const rowHeightInput = screen.getAllByLabelText('Height')[0];
      expect(rowHeightInput.value).toBe('200px');
      expect(mockSdk.app.notifier.success).toHaveBeenCalledWith('Layout "Loaded Layout 1" loaded.');
    });

    test('shows message if no layouts found to load', async () => {
      mockSdk.space.getEntries.mockResolvedValueOnce({ items: [], total: 0 });
      render(<LayoutEditor space={mockSdk.space} ids={mockSdk.ids} app={mockSdk.app} />);

      fireEvent.click(screen.getByRole('button', { name: /Load Layout Structure/i }));

      expect(await screen.findByText(/No saved layouts found./i)).toBeInTheDocument();
      expect(mockSdk.app.notifier.info).toHaveBeenCalledWith('No saved layout structures found.');
    });
  });
});
