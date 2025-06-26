import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalConfirmHeader,
  ModalControls,
  ModalContent,
  FormControl,
  FormLabel,
  TextInput,
  Textarea, // For description if we add it later to slots
  Button,
  Checkbox, // For selecting content types
  Stack,
  HelpText,
  Paragraph,
} from '@contentful/f36-components';

const SlotDefinitionModal = ({
  isOpen,
  onClose,
  onSave,
  initialSlotData, // { id, label, cellId, allowedContentTypes }
  cellId, // The ID of the cell being configured
  availableContentTypes, // [{id, name}]
  existingSlotIds, // Array of already used slot IDs in this configuration (for uniqueness check)
}) => {
  const [slotId, setSlotId] = useState('');
  const [slotLabel, setSlotLabel] = useState('');
  const [selectedContentTypes, setSelectedContentTypes] = useState([]);
  const [idError, setIdError] = useState('');

  useEffect(() => {
    if (initialSlotData) {
      setSlotId(initialSlotData.id || '');
      setSlotLabel(initialSlotData.label || '');
      setSelectedContentTypes(initialSlotData.allowedContentTypes || []);
    } else {
      // Reset for new slot definition
      setSlotId('');
      setSlotLabel('');
      setSelectedContentTypes([]);
    }
    setIdError(''); // Clear error on open or data change
  }, [initialSlotData, isOpen]); // Re-run if isOpen changes to reset form for new slot

  const handleContentTypeChange = (contentTypeId) => {
    setSelectedContentTypes(prev =>
      prev.includes(contentTypeId)
        ? prev.filter(id => id !== contentTypeId)
        : [...prev, contentTypeId]
    );
  };

  const handleSave = () => {
    if (!slotId.trim()) {
      setIdError('Slot ID is required.');
      return;
    }
    // Basic validation for slot ID format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(slotId.trim())) {
        setIdError('Slot ID can only contain letters, numbers, underscores, and hyphens.');
        return;
    }
    // Uniqueness check (only for new slots, or if ID changed for existing)
    const isNewCollectionId = !initialSlotData || initialSlotData.id !== slotId;
    if (isNewCollectionId && existingSlotIds.includes(slotId.trim())) {
      setIdError(`Slot ID "${slotId.trim()}" is already in use for this configuration.`);
      return;
    }
    if (!slotLabel.trim()) {
        // Could add label validation too, but ID is critical
        // For now, let's allow empty label and default it later if needed
    }

    setIdError('');
    onSave({
      id: slotId.trim(),
      label: slotLabel.trim() || slotId.trim(), // Default label to ID if empty
      cellId: cellId, // This is passed in and fixed for this modal instance
      allowedContentTypes: selectedContentTypes,
    });
    onClose(); // Close modal after saving
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="medium">
      <ModalConfirmHeader
        title={initialSlotData ? "Edit Slot Definition" : "Define New Slot"}
        onClose={onClose}
      />
      <ModalContent>
        <Paragraph>
          You are defining a content slot for Cell ID: <strong>{cellId ? cellId.substring(0, 8) + '...' : 'N/A'}</strong>
        </Paragraph>
        <FormControl id="slotId" isRequired isInvalid={!!idError} marginBottom="spacingM">
          <FormLabel>Slot ID (Machine Name)</FormLabel>
          <TextInput
            value={slotId}
            onChange={e => {
              setSlotId(e.target.value);
              if (idError) setIdError(''); // Clear error on change
            }}
            placeholder="e.g., hero_banner, left_column_card"
          />
          {idError && <HelpText isInvalid>{idError}</HelpText>}
          {!idError && <HelpText>A unique identifier for this slot (letters, numbers, _, -).</HelpText>}
        </FormControl>

        <FormControl id="slotLabel" marginBottom="spacingM">
          <FormLabel>Slot Label (Display Name)</FormLabel>
          <TextInput
            value={slotLabel}
            onChange={e => setSlotLabel(e.target.value)}
            placeholder="e.g., Main Hero Banner, Primary Card"
          />
          <HelpText>A user-friendly label for this content slot.</HelpText>
        </FormControl>

        <FormControl id="allowedContentTypes" marginBottom="spacingM">
          <FormLabel>Allowed Content Types for this Slot</FormLabel>
          {availableContentTypes.length === 0 && (
            <Paragraph subdued>No content types found or failed to load.</Paragraph>
          )}
          <Stack flexDirection="column" spacing="spacingXs" style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${tokens.gray300}`, padding: tokens.spacingS }}>
            {availableContentTypes.map(ct => (
              <Checkbox
                key={ct.id}
                id={`ct-${ct.id}`}
                isChecked={selectedContentTypes.includes(ct.id)}
                onChange={() => handleContentTypeChange(ct.id)}
              >
                {ct.name} ({ct.id})
              </Checkbox>
            ))}
          </Stack>
          <HelpText>Select which content types can be placed in this slot. If none are selected, any content type might be allowed (depending on consuming application).</HelpText>
        </FormControl>
      </ModalContent>
      <ModalControls>
        <Button variant="transparent" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="positive" onClick={handleSave}>
          {initialSlotData ? "Save Changes" : "Define Slot"}
        </Button>
      </ModalControls>
    </Modal>
  );
};

export default SlotDefinitionModal;
