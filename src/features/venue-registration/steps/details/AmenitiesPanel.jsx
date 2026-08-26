import AmenityTagInput from '../../components/AmenityTagInput';
import useDetails from './useDetails';

/**
 * Amenities panel — free-form tags (AC, recliners, Dolby Atmos…).
 */
export default function AmenitiesPanel() {
  const { details, addAmenity, removeAmenity, flushNow } = useDetails();

  return (
    <div className="rv-panel">
      <div className="rv-panel-h" style={{ marginBottom: 6 }}>
        Amenities
      </div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 14 }}>
        Type an amenity and press Enter to add it.
      </div>
      <AmenityTagInput
        amenities={details.amenities}
        onAdd={addAmenity}
        onRemove={removeAmenity}
        onBlurSave={flushNow}
      />
    </div>
  );
}
