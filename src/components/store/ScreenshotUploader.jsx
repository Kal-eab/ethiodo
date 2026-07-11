import React, { useState, useRef } from 'react';
import { X, Loader2, Upload, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// Draggable payment-screenshot uploader — used for the 10% deposit at checkout
// and again for the 90% final payment after delivery.
export default function ScreenshotUploader({ screenshots, onChange }) {
  const [uploading, setUploading] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of Array.from(files)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      onChange([...screenshots, ...urls]);
    } catch (err) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const removeScreenshot = (idx) => {
    onChange(screenshots.filter((_, i) => i !== idx));
  };

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOver.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const arr = [...screenshots];
    const dragged = arr.splice(dragItem.current, 1)[0];
    arr.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    onChange(arr);
  };

  return (
    <div className="space-y-3">
      {/* Uploaded screenshots — draggable row */}
      {screenshots.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {screenshots.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="relative flex-shrink-0 w-24 h-24 border overflow-hidden cursor-grab active:cursor-grabbing select-none"
              style={{ borderColor: i === 0 ? 'hsl(72,100%,50%)' : undefined }}
            >
              <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground font-mono text-[8px] text-center py-0.5">
                  FIRST
                </div>
              )}
              {/* Drag handle hint */}
              <div className="absolute top-1 left-1 opacity-60">
                <GripVertical className="w-3 h-3 text-white drop-shadow" />
              </div>
              <button
                type="button"
                onClick={() => removeScreenshot(i)}
                className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <label className="flex items-center justify-center gap-2 h-12 border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-secondary/40">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="font-mono text-xs text-muted-foreground">Uploading…</span></>
        ) : (
          <><Upload className="w-4 h-4 text-muted-foreground" /><span className="font-mono text-xs text-muted-foreground">Upload payment screenshot(s)</span></>
        )}
      </label>

      {screenshots.length > 1 && (
        <p className="font-mono text-[10px] text-muted-foreground">Drag images left/right to reorder — first image is shown first.</p>
      )}
    </div>
  );
}
