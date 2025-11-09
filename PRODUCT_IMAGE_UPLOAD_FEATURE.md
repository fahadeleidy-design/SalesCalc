# Product Image Upload Feature

## Overview
Complete product image management system with single and bulk upload capabilities, storage integration, and automatic display in quotations.

---

## Features Added

### 1. Product Image Upload (Single)

**UI Enhancements - Products Page:**
- Image upload section in product form
- Image preview before saving
- Remove image button
- File size validation (5MB max)
- Supported formats: JPG, PNG, WEBP, GIF

**Upload Process:**
1. Admin selects image file
2. Image previews instantly
3. On save, image uploads to Supabase Storage
4. Public URL saved to product record
5. Image displayed on product card

**Product Display:**
- Product cards show images (if available)
- 40px height thumbnail
- Rounded corners with border
- Fallback to icon if no image

---

### 2. Bulk CSV Import with Images

**Enhanced Import System:**

**CSV Format:**
```
SKU,Name,Description,Category,Unit,Unit Price,Cost Price,Image URL,Active
```

**Features:**
- Import products with direct image URLs
- Update existing products (by SKU)
- Create new products
- Detailed error reporting
- Success/failure statistics

**Import Process:**
1. Admin uploads CSV file
2. System validates each row
3. Database function processes bulk insert/update
4. Import history saved
5. Detailed results displayed

**Error Handling:**
- Row-level error tracking
- Continues on errors
- Shows successful vs failed count
- Error details in console

---

### 3. Product Images in Quotations

**Quotation Display:**
- Product images show next to item names
- 16px x 16px thumbnail
- Clean, professional appearance
- Only shows for catalog products (not custom items)

**PDF Export:**
- Images included in exported quotations
- Professional presentation
- Consistent branding

---

### 4. Storage System

**Supabase Storage Bucket: `product-images`**

**Configuration:**
- Public bucket (images accessible via URL)
- 5MB file size limit
- Allowed formats: JPEG, PNG, WEBP, GIF
- Organized by product ID

**Storage Policies:**
- Anyone can view images (public)
- Only Admin/Engineering can upload
- Only Admin/Engineering can update
- Only Admin/Engineering can delete

**File Naming:**
```
{product-id}-{timestamp}.{extension}
```
Example: `abc123-1699999999999.jpg`

---

### 5. Database Changes

**Products Table:**
```sql
-- Existing field
image_url text

-- New field for multiple images
images jsonb DEFAULT '[]'::jsonb
```

**Helper Functions:**
```sql
add_product_image(product_id, image_url)
remove_product_image(product_id, image_url)
bulk_import_products(products_json, file_name)
```

**Import History Table:**
```sql
CREATE TABLE product_import_history (
  id uuid PRIMARY KEY,
  imported_by uuid,
  file_name text,
  total_rows integer,
  successful_imports integer,
  failed_imports integer,
  error_log jsonb,
  import_type text,
  created_at timestamptz
);
```

---

## User Workflows

### Single Image Upload

1. **Navigate to Products Page**
2. **Click "Add Product" or edit existing**
3. **Fill in product details**
4. **Click "Choose Image"**
5. **Select image file (max 5MB)**
6. **Preview appears**
7. **Click "Add/Update Product"**
8. **Image uploads and saves**
9. **Image displays on product card**

### Bulk Import with Images

1. **Navigate to Products Page**
2. **Click "Import from CSV"**
3. **Prepare CSV file:**
   ```csv
   SKU,Name,Description,Category,Unit,Unit Price,Cost Price,Image URL,Active
   DESK-001,Executive Desk,Premium desk,Furniture,unit,2500,1500,https://example.com/desk.jpg,Yes
   CHAIR-001,Office Chair,Ergonomic chair,Furniture,unit,800,400,https://example.com/chair.jpg,Yes
   ```
4. **Upload CSV file**
5. **System processes:**
   - Validates each row
   - Updates existing products (matching SKU)
   - Creates new products
   - Downloads images from URLs (if provided)
6. **View results:**
   - ✅ Successful: X products
   - ❌ Failed: Y products
   - Error details in console
7. **Products with images appear immediately**

### View in Quotations

1. **Create/View quotation**
2. **Product images automatically display**
3. **Professional presentation**
4. **Customer sees products visually**
5. **Export to PDF includes images**

---

## CSV Import Examples

### Example 1: Simple Products
```csv
SKU,Name,Description,Category,Unit,Unit Price,Cost Price,Image URL,Active
DESK-001,Executive Desk,Premium mahogany desk,Furniture,unit,2500,1500,https://images.example.com/desk.jpg,Yes
CHAIR-001,Office Chair,Ergonomic mesh chair,Furniture,unit,800,400,https://images.example.com/chair.jpg,Yes
TABLE-001,Conference Table,10-seater table,Furniture,unit,5000,3000,,Yes
```

### Example 2: Update Existing Products
```csv
SKU,Name,Description,Category,Unit,Unit Price,Cost Price,Image URL,Active
DESK-001,Executive Desk Deluxe,Updated premium desk,Furniture,unit,2800,1600,https://images.example.com/desk-new.jpg,Yes
```
*Existing product with SKU "DESK-001" will be updated with new values*

### Example 3: With Cost Prices (Finance Data)
```csv
SKU,Name,Description,Category,Unit,Unit Price,Cost Price,Image URL,Active
LAMP-001,Desk Lamp,LED adjustable lamp,Accessories,unit,150,80,https://images.example.com/lamp.jpg,Yes
MONITOR-001,24" Monitor,Full HD display,Electronics,unit,800,500,https://images.example.com/monitor.jpg,Yes
```

---

## Technical Implementation

### Image Upload Flow

```
User selects image
  ↓
File validated (size, type)
  ↓
Preview generated (base64)
  ↓
Product saved to database
  ↓
Image uploaded to storage
  ↓
Public URL generated
  ↓
Product updated with URL
  ↓
Image displayed
```

### Bulk Import Flow

```
CSV uploaded
  ↓
File parsed
  ↓
Rows validated
  ↓
Database function called
  ↓
For each row:
  - Check if SKU exists
  - Update or Insert
  - Download image (if URL)
  - Handle errors
  ↓
Return results
  ↓
Display statistics
```

---

## Security

### Storage Security
- **Public Read:** Images accessible via URL (required for quotations)
- **Protected Write:** Only admins/engineering can upload
- **File Validation:** Size and type checked
- **Secure URLs:** Random filenames prevent guessing

### RLS Policies
```sql
-- View: Anyone (public bucket)
-- Upload: Admin/Engineering only
-- Update: Admin/Engineering only
-- Delete: Admin/Engineering only
```

### Import Security
- **Function runs as DEFINER:** Secure execution
- **User validation:** Only admins can import
- **Import history:** All imports logged
- **Error isolation:** One bad row doesn't fail entire import

---

## Error Handling

### Image Upload Errors
- **File too large:** "Image size must be less than 5MB"
- **Wrong format:** File type validation
- **Upload failed:** Error logged, product still saved
- **Network error:** User notified to retry

### Bulk Import Errors
- **Invalid CSV:** "File must contain headers and at least one product"
- **Missing required fields:** Row skipped, logged
- **Duplicate SKU:** Updates existing product
- **Invalid data:** Row skipped, error logged
- **Partial success:** Shows X successful, Y failed

---

## Performance

### Optimizations
- **Lazy loading:** Images load as needed
- **Compression:** Recommended before upload
- **CDN:** Supabase Storage uses CDN
- **Caching:** Browser caches images
- **Batch processing:** Bulk imports process efficiently

### Recommendations
- **Image size:** Keep under 1MB for best performance
- **Dimensions:** 800x800px recommended
- **Format:** WEBP for smallest size
- **Bulk imports:** Process in batches of 100 rows

---

## Business Benefits

### For Admin Team
✅ **Easy product management** - Drag-and-drop image upload
✅ **Bulk operations** - Import hundreds of products at once
✅ **Visual catalog** - Professional product presentation
✅ **Time savings** - No manual one-by-one entry

### For Sales Team
✅ **Visual quotations** - Show customers what they're buying
✅ **Professional look** - Images in quotes and PDFs
✅ **Faster sales** - Customers see products visually
✅ **Better communication** - No confusion about products

### For Customers
✅ **Visual clarity** - See what they're ordering
✅ **Confidence** - Know exactly what to expect
✅ **Professional experience** - High-quality presentations
✅ **Easy decision-making** - Visual aids help choices

---

## Future Enhancements

### Potential Additions
1. **Multiple Images** - Gallery per product
2. **Image Cropping** - Built-in image editor
3. **Drag-and-Drop** - Direct drag onto form
4. **Image Library** - Reusable image database
5. **Auto-resize** - Automatic optimization
6. **3D Views** - 360° product images
7. **Video Support** - Product videos
8. **AR Preview** - Augmented reality view

---

## CSV Template

Download this template to get started:

```csv
SKU,Name,Description,Category,Unit,Unit Price,Cost Price,Image URL,Active
SAMPLE-001,Sample Product,This is a sample description,Sample Category,unit,100,50,https://example.com/image.jpg,Yes
```

**Instructions:**
1. Copy the header row exactly
2. Fill in your product details
3. Provide full image URLs (https://...)
4. Active: "Yes" or "No"
5. Save as CSV file
6. Import via Products page

---

## Troubleshooting

### Image Won't Upload
- Check file size (must be < 5MB)
- Check file type (JPG, PNG, WEBP, GIF only)
- Check internet connection
- Try refreshing the page

### Image Not Displaying
- Check if URL is valid
- Verify storage bucket is public
- Clear browser cache
- Check console for errors

### Bulk Import Failed
- Verify CSV format matches template
- Check for special characters in data
- Ensure SKUs are unique or valid
- Review error log in console

### Images Missing in Quotation
- Verify product has image_url set
- Check if product is custom item (no image)
- Refresh quotation
- Check browser console for errors

---

## API Reference

### Upload Image Function
```typescript
async function uploadImage(productId: string, file: File): Promise<string | null>
```

### Bulk Import Function
```sql
FUNCTION bulk_import_products(
  p_products jsonb,
  p_file_name text
) RETURNS jsonb
```

### Add Image Helper
```sql
FUNCTION add_product_image(
  p_product_id uuid,
  p_image_url text
) RETURNS boolean
```

---

## Conclusion

The product image upload system provides a complete solution for visual product management with:

- **Single image upload** - Easy drag-and-drop interface
- **Bulk CSV import** - Process hundreds of products
- **Automatic display** - Images in products and quotations
- **Professional presentation** - Enhanced customer experience
- **Secure storage** - Supabase Storage integration

The system is production-ready, scalable, and designed for ease of use by admin teams while providing maximum value to sales teams and customers.
