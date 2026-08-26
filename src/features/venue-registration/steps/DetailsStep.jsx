import { useVenueDraftContext } from '../context/VenueDraftContext';
import CategoryPanel from './details/CategoryPanel';
import CapacityPanel from './details/CapacityPanel';
import PricingPackagesPanel from './details/PricingPackagesPanel';
import ExtraPersonPanel from './details/ExtraPersonPanel';
import AmenitiesPanel from './details/AmenitiesPanel';
import PerSportPricingPanel from './details/PerSportPricingPanel';
import FullDescriptionPanel from './details/FullDescriptionPanel';
import AddOnsPanel from './details/AddOnsPanel';
import OffersPanel from './details/OffersPanel';

/**
 * Step 4 · Details — category, capacity, pricing, amenities and add-ons.
 * The set of panels shown depends on the selected primary category.
 */
export default function DetailsStep() {
  const { draft } = useVenueDraftContext();
  const cat = draft.details.primaryCategory;
  const isPlayzone = cat === 'Playzone';
  const isResort = cat === 'Resort';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CategoryPanel />
      <CapacityPanel />
      {!isPlayzone && <PricingPackagesPanel />}
      {!isPlayzone && !isResort && <ExtraPersonPanel />}
      <AmenitiesPanel />
      {isPlayzone && <PerSportPricingPanel />}
      <FullDescriptionPanel />
      <AddOnsPanel />
      <OffersPanel />
    </div>
  );
}
