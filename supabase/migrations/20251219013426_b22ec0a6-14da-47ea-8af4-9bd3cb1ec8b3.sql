-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence', 'evidence', true);

-- Allow authenticated users to upload evidence files
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to view their own evidence
CREATE POLICY "Users can view their own evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to evidence (for managers/directors to review)
CREATE POLICY "Public read access to evidence"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidence');

-- Allow users to delete their own evidence
CREATE POLICY "Users can delete their own evidence"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);