import { useState } from 'react';
import { Form, InputGroup } from 'react-bootstrap';

export default function PortionSelector({ value = 1, onChange, label = 'Portion Eaten' }) {
  const presetValues = [1, 0.5, 0.333, 0.25, 0.167, 0.125, 0.083];
  const [mode, setMode] = useState(presetValues.includes(value) ? 'preset' : 'custom');

  const presets = [
    { value: 1, label: '1 whole meal' },
    { value: 0.5, label: '1/2 meal' },
    { value: 0.333, label: '1/3 meal' },
    { value: 0.25, label: '1/4 meal' },
    { value: 0.167, label: '1/6 meal' },
    { value: 0.125, label: '1/8 meal' },
    { value: 0.083, label: '1/12 meal' }
  ];

  function handlePresetChange(e) {
    const numValue = Number(e.target.value);
    const preset = presets.find(p => p.value === numValue);
    onChange({ portion: numValue, portionLabel: preset?.label || '' });
  }

  function parsePortion(input) {
    if (input.includes('/')) {
      const parts = input.split('/');
      if (parts.length === 2) {
        const numerator = Number(parts[0]);
        const denominator = Number(parts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
          return numerator / denominator;
        }
      }
    }

    return Number(input);
  }

  function handleCustomChange(e) {
    const stringValue = e.target.value;
    const numValue = parsePortion(stringValue);

    if (isNaN(numValue) || numValue <= 0) return;

    onChange({
      portion: numValue,
      portionLabel: `${stringValue}${stringValue.includes('/') ? ' meal' : ' x meal'}`
    });
  }

  const currentPreset = presets.find(p => p.value === value);

  return (
    <Form.Group>
      <Form.Label>{label}</Form.Label>

      <div className="mb-2">
        <Form.Check
          type="radio"
          label="Select from preset"
          name="portionMode"
          value="preset"
          checked={mode === 'preset'}
          onChange={() => setMode('preset')}
        />
      </div>

      {mode === 'preset' && (
        <Form.Select value={currentPreset?.value || 1} onChange={handlePresetChange} className="mb-3">
          {presets.map(preset => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </Form.Select>
      )}

      <div className="mb-2">
        <Form.Check
          type="radio"
          label="Enter custom value"
          name="portionMode"
          value="custom"
          checked={mode === 'custom'}
          onChange={() => setMode('custom')}
        />
      </div>

      {mode === 'custom' && (
        <InputGroup className="mb-2">
          <Form.Control
            type="text"
            placeholder="0.5 or 1/2 or 1/12"
            onChange={handleCustomChange}
          />
          <InputGroup.Text>of meal</InputGroup.Text>
        </InputGroup>
      )}
    </Form.Group>
  );
}
