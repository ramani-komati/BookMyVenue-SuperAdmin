import { MAX_SERVICE_IMAGES, MAX_VENUE_PHOTOS } from '@/constants/venue';
import { useVenueDraftContext } from '../context/VenueDraftContext';
import PhotoUploader from '../components/PhotoUploader';

/**
 * Step 3 · Photos — venue gallery (required) and optional service images.
 * Each file is uploaded through its own venueApi.uploadPhoto call.
 */
export default function PhotosStep() {
  const { draft, addPhotos, removePhoto, photoError } = useVenueDraftContext();
  const { venuePhotos, serviceImages } = draft.photos;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {photoError && (
        <div role="alert" style={{ background: 'var(--error-50)', color: 'var(--error-700)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-semibold)' }}>
          {photoError}
        </div>
      )}
      <PhotoUploader
        title="Add venue photos"
        requiredMark
        description="Upload up to 5 venue photos. They auto-rotate every 5 seconds on the venue page."
        photos={venuePhotos}
        max={MAX_VENUE_PHOTOS}
        onAdd={(files) => addPhotos('venuePhotos', files)}
        onRemove={(id) => removePhoto('venuePhotos', id)}
        countLabel={`${venuePhotos.length} / ${MAX_VENUE_PHOTOS} uploaded`}
      />

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 28 }}>
        <PhotoUploader
          title="Service images (optional)"
          description='Up to 10 photos of services you offer (decoration, catering, equipment). Shown on the venue page under "Our services".'
          photos={serviceImages}
          max={MAX_SERVICE_IMAGES}
          onAdd={(files) => addPhotos('serviceImages', files)}
          onRemove={(id) => removePhoto('serviceImages', id)}
          countLabel={`${serviceImages.length} / ${MAX_SERVICE_IMAGES} uploaded`}
        />
      </div>
    </div>
  );
}
