
CREATE TABLE public."Students" (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT NOT NULL DEFAULT 'Flexible',
  workload INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public."Students" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Students" TO authenticated;
GRANT ALL ON public."Students" TO service_role;

ALTER TABLE public."Students" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view students" ON public."Students" FOR SELECT USING (true);
