-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'manager', 'director');

-- Create departments table (org tree structure)
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);

-- Create rubric templates table
CREATE TABLE public.rubric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rubric sections table
CREATE TABLE public.rubric_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.rubric_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rubric indicators table
CREATE TABLE public.rubric_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.rubric_sections(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  director_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.rubric_templates(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'self_submitted', 'manager_reviewed', 'director_approved', 'rejected')),
  staff_scores JSONB DEFAULT '{}',
  manager_scores JSONB DEFAULT '{}',
  staff_evidence JSONB DEFAULT '{}',
  manager_evidence JSONB DEFAULT '{}',
  final_score DECIMAL(4,2),
  final_grade TEXT,
  staff_submitted_at TIMESTAMPTZ,
  manager_reviewed_at TIMESTAMPTZ,
  director_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE user_id = _user_id
$$;

-- RLS Policies for departments
CREATE POLICY "Everyone can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rubric_templates
CREATE POLICY "Everyone can view rubrics" ON public.rubric_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and Directors can create rubrics" ON public.rubric_templates FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators can update rubrics" ON public.rubric_templates FOR UPDATE TO authenticated 
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete rubrics" ON public.rubric_templates FOR DELETE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rubric_sections
CREATE POLICY "Everyone can view sections" ON public.rubric_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and Directors can manage sections" ON public.rubric_sections FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rubric_indicators
CREATE POLICY "Everyone can view indicators" ON public.rubric_indicators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and Directors can manage indicators" ON public.rubric_indicators FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for assessments
CREATE POLICY "Staff can view own assessments" ON public.assessments FOR SELECT TO authenticated 
  USING (staff_id = auth.uid() OR manager_id = auth.uid() OR director_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can create own assessments" ON public.assessments FOR INSERT TO authenticated 
  WITH CHECK (staff_id = auth.uid());
CREATE POLICY "Staff can update own draft assessments" ON public.assessments FOR UPDATE TO authenticated 
  USING (staff_id = auth.uid() AND status = 'draft');
CREATE POLICY "Managers can update assigned assessments" ON public.assessments FOR UPDATE TO authenticated 
  USING (manager_id = auth.uid() AND status IN ('self_submitted', 'manager_reviewed'));
CREATE POLICY "Directors can update for approval" ON public.assessments FOR UPDATE TO authenticated 
  USING (director_id = auth.uid() AND status = 'manager_reviewed');
CREATE POLICY "Admins can manage all assessments" ON public.assessments FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Default role is staff
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rubric_templates_updated_at BEFORE UPDATE ON public.rubric_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();