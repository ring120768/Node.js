# Dashboard Cards - Complete Component Reference

## 1. React Component (TypeScript)

### Base Card Component

```typescript
import React from 'react';
import './dashboard-cards.css';

interface CardProps {
  title: string;
  badge?: {
    text: string;
    variant: 'success' | 'completed' | 'processing' | 'pending' | 'failed';
  };
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, badge, children }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {badge && (
          <span className={`card-badge badge-${badge.variant}`}>
            {badge.text}
          </span>
        )}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
};
```

### Image Card Component

```typescript
import React from 'react';
import './dashboard-cards.css';

interface ImageCardProps {
  document: {
    id: string;
    document_type: string;
    status: 'completed' | 'processing' | 'pending' | 'failed';
    signed_url?: string;
    public_url?: string;
    created_at: string;
  };
  onClick?: (document: ImageCardProps['document']) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ document, onClick }) => {
  const imageUrl = document.signed_url || document.public_url;

  const formatDocumentType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getBadgeIcon = (status: string) => {
    const icons = {
      completed: '✓',
      processing: '⏳',
      pending: '⏱',
      failed: '✗'
    };
    return icons[status] || '⏱';
  };

  const handleClick = () => {
    if (onClick) onClick(document);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) onClick(document);
    }
  };

  return (
    <div
      className="card card-interactive"
      tabIndex={0}
      role="button"
      aria-label={`View ${formatDocumentType(document.document_type)} image`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={formatDocumentType(document.document_type)}
          className="card-image"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="card-image" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem'
        }}>
          🖼️
        </div>
      )}
      <div className="card-content">
        <h4>{formatDocumentType(document.document_type)}</h4>
        <div className="card-meta">
          <span className={`badge badge-${document.status}`}>
            {getBadgeIcon(document.status)} {document.status}
          </span>
          <time dateTime={document.created_at}>
            {formatDate(document.created_at)}
          </time>
        </div>
      </div>
    </div>
  );
};
```

### Transcription Card Component

```typescript
import React from 'react';
import './dashboard-cards.css';

interface TranscriptionCardProps {
  transcription: {
    id: string;
    title?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    created_at: string;
  };
}

export const TranscriptionCard: React.FC<TranscriptionCardProps> = ({
  transcription
}) => {
  const getProgress = (status: string): number => {
    const progressMap = {
      pending: 10,
      processing: 65,
      completed: 100,
      failed: 0
    };
    return progressMap[status] || 0;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: { icon: '✓', text: 'Complete', class: 'badge-completed' },
      processing: { icon: '⏳', text: 'Processing...', class: 'badge-processing' },
      failed: { icon: '✗', text: 'Failed', class: 'badge-failed' }
    };
    return badges[status] || badges.processing;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const progress = getProgress(transcription.status);
  const badge = getStatusBadge(transcription.status);

  return (
    <div className="card">
      <div className="card-header">
        <h4>{transcription.title || 'Incident Description'}</h4>
        <span className={`badge ${badge.class}`}>
          {badge.icon} {badge.text}
        </span>
      </div>
      <div className="card-body">
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Processing progress"
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="card-meta">
          {transcription.status === 'completed' ? 'Completed' : 'Uploaded'}: {formatDate(transcription.created_at)}
        </p>
      </div>
    </div>
  );
};
```

### Empty State Card

```typescript
import React from 'react';
import './dashboard-cards.css';

interface EmptyStateCardProps {
  icon?: string;
  title: string;
  message: string;
  buttonText?: string;
  buttonLink?: string;
  onButtonClick?: () => void;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon = '📁',
  title,
  message,
  buttonText,
  buttonLink,
  onButtonClick
}) => {
  return (
    <div className="card card-empty">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {buttonText && (
        buttonLink ? (
          <a href={buttonLink} className="btn btn-primary">
            {buttonText}
          </a>
        ) : (
          <button className="btn btn-primary" onClick={onButtonClick}>
            {buttonText}
          </button>
        )
      )}
    </div>
  );
};
```

### Skeleton Loader Card

```typescript
import React from 'react';
import './dashboard-cards.css';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="card card-skeleton" aria-busy="true" aria-label="Loading content">
      <div className="skeleton skeleton-image" />
      <div className="skeleton-content">
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text short" />
      </div>
    </div>
  );
};

interface SkeletonLoaderProps {
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ count = 6 }) => {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};
```

## 2. Styling (Tailwind CSS)

### Installation

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
```

### tailwind.config.js

```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#0B7AB0',
          'blue-dark': '#095A85',
          'blue-light': '#0D8DC7',
        },
        status: {
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        }
      },
      spacing: {
        '18': '4.5rem',
      },
      borderRadius: {
        'card': '0.75rem',
      }
    },
  },
  plugins: [],
}
```

### Tailwind CSS Component Classes

```jsx
// Base Card
<div className="bg-white rounded-card shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
  <div className="flex justify-between items-start p-6 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900">Title</h3>
    <span className="px-3 py-1 bg-primary-blue text-white rounded-full text-xs font-semibold">
      Badge
    </span>
  </div>
  <div className="p-6">
    Content
  </div>
</div>

// Image Card
<div className="bg-white rounded-card shadow-sm overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-primary-blue-light">
  <img
    src="url"
    alt="Description"
    className="w-full h-50 object-cover bg-gray-100"
  />
  <div className="p-4">
    <h4 className="font-semibold mb-2">Document Name</h4>
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
        ✓ Completed
      </span>
      <time>28 Oct 2025</time>
    </div>
  </div>
</div>

// Progress Bar
<div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-primary-blue to-primary-blue-light rounded-full transition-all duration-300"
    style={{ width: '65%' }}
  />
</div>

// Empty State
<div className="bg-white rounded-card shadow-sm p-12 text-center">
  <div className="text-6xl mb-4 opacity-30">📁</div>
  <h3 className="text-xl mb-2 text-gray-900">No Images Yet</h3>
  <p className="text-gray-600 mb-6">Upload images to get started</p>
  <button className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-primary-blue-dark transition-colors">
    Upload Now
  </button>
</div>

// Skeleton Loader
<div className="bg-white rounded-card shadow-sm overflow-hidden pointer-events-none">
  <div className="w-full h-50 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]" />
  <div className="p-4">
    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded mb-2" />
    <div className="h-4 w-3/5 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded" />
  </div>
</div>
```

### Custom Animations (tailwind.config.js)

```javascript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        }
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      }
    }
  }
}
```

## 3. State Management (Context API)

```typescript
// DashboardContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface Document {
  id: string;
  document_type: string;
  status: string;
  signed_url?: string;
  public_url?: string;
  created_at: string;
}

interface DashboardState {
  images: Document[];
  transcriptions: any[];
  loading: boolean;
  error: string | null;
}

interface DashboardContextValue extends DashboardState {
  loadImages: (userId: string) => Promise<void>;
  loadTranscriptions: (userId: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DashboardState>({
    images: [],
    transcriptions: [],
    loading: false,
    error: null
  });

  const loadImages = async (userId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/user-documents?user_id=${userId}&document_type=image`
      );

      if (!response.ok) throw new Error('Failed to load images');

      const data = await response.json();
      const images = data.data?.documents || [];

      setState(prev => ({ ...prev, images, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const loadTranscriptions = async (userId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/transcription/history?user_id=${userId}`
      );

      if (!response.ok) throw new Error('Failed to load transcriptions');

      const data = await response.json();
      const transcriptions = data.transcriptions || [];

      setState(prev => ({ ...prev, transcriptions, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  return (
    <DashboardContext.Provider value={{
      ...state,
      loadImages,
      loadTranscriptions
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
```

## 4. Usage Example (React Hook-Based)

```tsx
// ImagesSection.tsx
import React, { useEffect } from 'react';
import { useDashboard } from './DashboardContext';
import { ImageCard } from './components/ImageCard';
import { SkeletonLoader } from './components/SkeletonCard';
import { EmptyStateCard } from './components/EmptyStateCard';

interface ImagesSectionProps {
  userId: string;
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({ userId }) => {
  const { images, loading, error, loadImages } = useDashboard();
  const [selectedImage, setSelectedImage] = React.useState(null);

  useEffect(() => {
    loadImages(userId);
  }, [userId]);

  if (loading) {
    return <SkeletonLoader count={6} />;
  }

  if (error) {
    return (
      <EmptyStateCard
        icon="⚠️"
        title="Failed to Load Images"
        message={error}
        buttonText="Try Again"
        onButtonClick={() => loadImages(userId)}
      />
    );
  }

  if (images.length === 0) {
    return (
      <EmptyStateCard
        icon="🖼️"
        title="No Images Yet"
        message="Upload images via the signup form"
        buttonText="Upload Now"
        buttonLink="/incident.html"
      />
    );
  }

  return (
    <>
      <div className="cards-grid">
        {images.map(image => (
          <ImageCard
            key={image.id}
            document={image}
            onClick={setSelectedImage}
          />
        ))}
      </div>

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
};
```

## 5. Unit Tests (Jest + React Testing Library)

```typescript
// ImageCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageCard } from './ImageCard';

describe('ImageCard', () => {
  const mockDocument = {
    id: '123',
    document_type: 'driving_license_picture',
    status: 'completed',
    signed_url: 'https://example.com/image.jpg',
    created_at: '2025-10-28T10:45:00Z'
  };

  it('renders document information correctly', () => {
    render(<ImageCard document={mockDocument} />);

    expect(screen.getByText('Driving License Picture')).toBeInTheDocument();
    expect(screen.getByText(/28 Oct 2025/)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', mockDocument.signed_url);
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<ImageCard document={mockDocument} onClick={handleClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledWith(mockDocument);
  });

  it('handles keyboard navigation', () => {
    const handleClick = jest.fn();
    render(<ImageCard document={mockDocument} onClick={handleClick} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledWith(mockDocument);
  });

  it('displays correct status badge', () => {
    render(<ImageCard document={mockDocument} />);

    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('shows placeholder when image fails to load', () => {
    render(<ImageCard document={{ ...mockDocument, signed_url: undefined }} />);

    expect(screen.getByText('🖼️')).toBeInTheDocument();
  });
});

// SkeletonCard.test.tsx
describe('SkeletonLoader', () => {
  it('renders correct number of skeleton cards', () => {
    const { container } = render(<SkeletonLoader count={3} />);

    const skeletons = container.querySelectorAll('.card-skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('has correct ARIA attributes', () => {
    render(<SkeletonLoader count={1} />);

    const skeleton = screen.getByLabelText('Loading content');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });
});

// EmptyStateCard.test.tsx
describe('EmptyStateCard', () => {
  it('renders empty state with custom content', () => {
    render(
      <EmptyStateCard
        icon="📁"
        title="No Data"
        message="Nothing to show"
        buttonText="Add Data"
      />
    );

    expect(screen.getByText('📁')).toBeInTheDocument();
    expect(screen.getByText('No Data')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    expect(screen.getByText('Add Data')).toBeInTheDocument();
  });

  it('calls button click handler', () => {
    const handleClick = jest.fn();
    render(
      <EmptyStateCard
        title="No Data"
        message="Nothing"
        buttonText="Click Me"
        onButtonClick={handleClick}
      />
    );

    const button = screen.getByText('Click Me');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalled();
  });
});
```

## 6. Accessibility Checklist

### ✅ Semantic HTML
- [ ] Use `<article>`, `<header>`, `<time>` elements
- [ ] Proper heading hierarchy (h1-h6)
- [ ] Button elements for interactive cards
- [ ] Alt text for all images

### ✅ ARIA Attributes
- [ ] `role="button"` for interactive cards
- [ ] `role="progressbar"` with `aria-valuenow`
- [ ] `aria-label` for status badges
- [ ] `aria-busy="true"` for skeleton loaders
- [ ] `aria-hidden="true"` for decorative icons

### ✅ Keyboard Navigation
- [ ] `tabindex="0"` on interactive cards
- [ ] Enter/Space key activation
- [ ] Escape key to close modals
- [ ] Visible focus indicators

### ✅ Color Contrast (WCAG 2.1 AA)
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] Interactive elements ≥ 3:1
- [ ] Status badges readable

### ✅ Motion & Animation
- [ ] `prefers-reduced-motion` support
- [ ] Animations can be disabled
- [ ] No auto-playing content

## 7. Performance Considerations

### Image Optimization
```typescript
// Lazy loading
<img
  src={imageUrl}
  alt={description}
  loading="lazy"
  decoding="async"
/>

// Responsive images
<img
  srcSet="image-400w.jpg 400w, image-800w.jpg 800w"
  sizes="(max-width: 768px) 100vw, 33vw"
/>
```

### Memoization
```typescript
import React, { memo } from 'react';

export const ImageCard = memo<ImageCardProps>(({ document, onClick }) => {
  // Component code
}, (prevProps, nextProps) => {
  return prevProps.document.id === nextProps.document.id &&
         prevProps.document.status === nextProps.document.status;
});
```

### Virtual Scrolling (Large Lists)
```typescript
import { FixedSizeGrid } from 'react-window';

const ImageGrid = ({ images }) => (
  <FixedSizeGrid
    columnCount={3}
    columnWidth={300}
    height={600}
    rowCount={Math.ceil(images.length / 3)}
    rowHeight={350}
    width={1000}
  >
    {({ columnIndex, rowIndex, style }) => (
      <div style={style}>
        <ImageCard document={images[rowIndex * 3 + columnIndex]} />
      </div>
    )}
  </FixedSizeGrid>
);
```

## 8. Deployment Checklist

### Pre-Deployment
- [ ] Run accessibility audit (aXe, WAVE)
- [ ] Test keyboard navigation
- [ ] Verify responsive breakpoints
- [ ] Check browser compatibility
- [ ] Run Lighthouse performance test
- [ ] Minify CSS and JavaScript
- [ ] Optimize images (WebP with fallback)

### Post-Deployment
- [ ] Monitor real user metrics (RUM)
- [ ] Check error logs
- [ ] Verify API endpoints working
- [ ] Test on actual devices
- [ ] Get user feedback

---

**Last Updated:** 28 October 2025
**Version:** 1.0.0
**License:** Car Crash Lawyer AI - Internal Use
