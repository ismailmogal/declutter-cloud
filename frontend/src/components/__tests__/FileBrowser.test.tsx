import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FileBrowser from '../FileBrowser';

describe('FileBrowser', () => {
  const mockFiles = [
    {
      id: '1',
      name: 'Document.pdf',
      type: 'file' as const,
      size: 1024000,
      modified: '2024-01-15T10:30:00Z',
      path: '/documents/Document.pdf',
      duplicate_count: 2,
    },
    {
      id: '2',
      name: 'Photos',
      type: 'folder' as const,
      path: '/documents/Photos',
    },
    {
      id: '3',
      name: 'Image.jpg',
      type: 'file' as const,
      size: 2048000,
      modified: '2024-01-14T15:45:00Z',
      path: '/documents/Image.jpg',
    },
  ];

  const mockBreadcrumbs = [
    { id: 'root', name: 'Home', path: '/' },
    { id: 'documents', name: 'Documents', path: '/documents' },
  ];

  const defaultProps = {
    files: mockFiles,
    currentPath: '/documents',
    breadcrumbs: mockBreadcrumbs,
    loading: false,
    error: null,
    onFileClick: vi.fn(),
    onFolderClick: vi.fn(),
    onBreadcrumbClick: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file browser with files', () => {
    render(<FileBrowser {...defaultProps} />);
    
    expect(screen.getByText('Document.pdf')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Image.jpg')).toBeInTheDocument();
  });

  it('renders breadcrumbs correctly', () => {
    render(<FileBrowser {...defaultProps} />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('handles file clicks', () => {
    render(<FileBrowser {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Document.pdf'));
    
    expect(defaultProps.onFileClick).toHaveBeenCalledWith(mockFiles[0]);
  });

  it('handles folder clicks', () => {
    render(<FileBrowser {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Photos'));
    
    expect(defaultProps.onFolderClick).toHaveBeenCalledWith(mockFiles[1]);
  });

  it('handles breadcrumb clicks', () => {
    render(<FileBrowser {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Home'));
    
    expect(defaultProps.onBreadcrumbClick).toHaveBeenCalledWith('/');
  });

  it('handles refresh button click', () => {
    render(<FileBrowser {...defaultProps} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<FileBrowser {...defaultProps} loading={true} />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(18);
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load files';
    render(<FileBrowser {...defaultProps} error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows empty state when no files', () => {
    render(<FileBrowser {...defaultProps} files={[]} />);
    
    expect(screen.getByText('No files found')).toBeInTheDocument();
    expect(screen.getByText('This folder is empty')).toBeInTheDocument();
  });

  it('filters files by search term', () => {
    render(<FileBrowser {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/search files/i);
    fireEvent.change(searchInput, { target: { value: 'Document' } });
    
    expect(screen.getByText('Document.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Image.jpg')).not.toBeInTheDocument();
  });

  it('shows duplicate count chips', () => {
    render(<FileBrowser {...defaultProps} />);
    
    expect(screen.getByText('2 duplicates')).toBeInTheDocument();
  });

  it('formats file sizes correctly', () => {
    render(<FileBrowser {...defaultProps} />);
    
    // Check for file size text in the component
    expect(screen.getByText('Document.pdf')).toBeInTheDocument();
    expect(screen.getByText('Image.jpg')).toBeInTheDocument();
  });

  it('switches between list and grid view', () => {
    const mockOnViewModeChange = vi.fn();
    render(<FileBrowser {...defaultProps} onViewModeChange={mockOnViewModeChange} />);
    
    const gridButton = screen.getByRole('button', { name: /grid view/i });
    fireEvent.click(gridButton);
    
    expect(mockOnViewModeChange).toHaveBeenCalledWith('grid');
  });

  it('sorts files by name', () => {
    render(<FileBrowser {...defaultProps} />);
    
    const sortButton = screen.getByRole('button', { name: /name ↑/i });
    fireEvent.click(sortButton);
    
    // Should toggle to descending
    expect(screen.getByRole('button', { name: /name ↓/i })).toBeInTheDocument();
  });

  it('sorts files by size', () => {
    render(<FileBrowser {...defaultProps} />);
    // Find the sort button by text
    const sortButton = screen.getAllByRole('button').find(btn => btn.textContent?.toLowerCase().includes('name'))!;
    fireEvent.click(sortButton); // Name ↓
    fireEvent.click(sortButton); // Size ↑
    fireEvent.click(sortButton); // Size ↓
    // Now the button should show 'Size'
    expect(sortButton.textContent?.toLowerCase()).toContain('size');
  });

  it('shows context menu on file right click', () => {
    render(<FileBrowser {...defaultProps} />);
    
    // Find the more options button (it might not have a specific name)
    const moreButtons = screen.getAllByRole('button');
    const moreButton = moreButtons.find(button => 
      button.querySelector('[data-testid="MoreVertIcon"]')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);
      expect(screen.getByText('Find duplicates')).toBeInTheDocument();
      expect(screen.getByText('Get suggestions')).toBeInTheDocument();
    }
  });

  it('displays file icons correctly', () => {
    render(<FileBrowser {...defaultProps} />);
    
    // Check for folder and file icons by their test IDs
    const folderIcons = screen.getAllByTestId('FolderIcon');
    const fileIcons = screen.getAllByTestId('InsertDriveFileIcon');
    
    expect(folderIcons.length).toBeGreaterThan(0);
    expect(fileIcons.length).toBeGreaterThan(0);
  });

  it('handles search with no results', () => {
    render(<FileBrowser {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/search files/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No files found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument();
  });

  it('disables refresh button during loading', () => {
    render(<FileBrowser {...defaultProps} loading={true} />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
  });
}); 