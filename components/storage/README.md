# Storage Components

UI components for IPFS storage operations with Storacha Network.

## Components

### UploadProgress

Displays real-time upload progress with provider information and error handling.

**Features:**
- Real-time progress tracking (0-100%)
- Provider badge (Storacha)
- Status indicators (uploading, success, error)
- Smooth progress animation
- Error messages with retry option
- Cancel functionality

**Usage:**

```tsx
import { UploadProgress } from '@/components/storage';
import { ipfsService } from '@/lib/storage';

function MyComponent() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [provider, setProvider] = useState<'storacha'>();
  const [error, setError] = useState<string>();

  const handleUpload = async (blob: Blob) => {
    setStatus('uploading');
    setProgress(0);
    
    try {
      const result = await ipfsService.uploadEncryptedBlob(blob, 'my-file', {
        onProgress: (p) => setProgress(p),
      });
      
      setProvider(result.provider);
      setStatus('success');
      console.log('Uploaded to IPFS:', result.cid);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <UploadProgress
      progress={progress}
      status={status}
      provider={provider}
      error={error}
      onRetry={handleUpload}
      onCancel={() => setStatus('idle')}
    />
  );
}
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `progress` | `number` | Current upload progress (0-100) |
| `status` | `'idle' \| 'uploading' \| 'success' \| 'error'` | Upload status |
| `provider` | `'storacha'` | Provider being used (optional) |
| `error` | `string` | Error message if upload failed (optional) |
| `onRetry` | `() => void` | Callback for retry action (optional) |
| `onCancel` | `() => void` | Callback for cancel action (optional) |

## Integration with IPFSService

The UploadProgress component is designed to work seamlessly with the IPFSService:

```tsx
import { ipfsService } from '@/lib/storage';
import { UploadProgress } from '@/components/storage';

// The StorachaService automatically:
// 1. Tries Storacha upload (3 attempts with exponential backoff)
// 2. Returns the provider used in the result
// 3. Calls onProgress callback during upload

const result = await ipfsService.uploadEncryptedBlob(
  encryptedBlob,
  'encrypted-media',
  {
    onProgress: (progress) => {
      // Update UI with progress
      setProgress(progress);
    }
  }
);

// result.provider will be 'storacha'
setProvider(result.provider);
```

## Testing

Visit `/test-media` to see a live demo of the UploadProgress component with simulated upload behavior including:
- Progress tracking
- Provider display (Storacha)
- Error handling with retry
- Success states

## Requirements

This component fulfills:
- **Requirement 5.4**: Upload progress tracking and display
