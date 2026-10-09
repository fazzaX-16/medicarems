CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, age int NOT NULL, gender text NOT NULL, phone text NOT NULL,
  blood_group text, address text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, specialization text NOT NULL, phone text NOT NULL, email text,
  fee numeric NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date date NOT NULL, appointment_time text NOT NULL, reason text,
  status text NOT NULL DEFAULT 'Scheduled', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, quantity int NOT NULL DEFAULT 0, price numeric NOT NULL DEFAULT 0,
  expiry_date date NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]', subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0, total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now());

DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['patients','doctors','appointments','medicines','bills'] LOOP
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('CREATE POLICY "demo full access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
END LOOP; END $$;

INSERT INTO public.patients (id,name,age,gender,phone,blood_group,address) VALUES
('11111111-0000-0000-0000-000000000001','Aarav Mehta',34,'Male','9876500001','B+','12 Lotus Lane, Pune'),
('11111111-0000-0000-0000-000000000002','Riya Kapoor',27,'Female','9876500002','O+','45 Rose Street, Mumbai'),
('11111111-0000-0000-0000-000000000003','Kabir Singh',52,'Male','9876500003','A-','8 Park Road, Delhi'),
('11111111-0000-0000-0000-000000000004','Ananya Rao',41,'Female','9876500004','AB+','22 Hill View, Bengaluru'),
('11111111-0000-0000-0000-000000000005','Vihaan Joshi',9,'Male','9876500005','O-','3 Lake Side, Nagpur');
INSERT INTO public.doctors (id,name,specialization,phone,email,fee) VALUES
('22222222-0000-0000-0000-000000000001','Dr. Neha Sharma','Cardiology','9000000001','neha@medicare.test',800),
('22222222-0000-0000-0000-000000000002','Dr. Arjun Patel','Orthopedics','9000000002','arjun@medicare.test',700),
('22222222-0000-0000-0000-000000000003','Dr. Sara Khan','Pediatrics','9000000003','sara@medicare.test',500),
('22222222-0000-0000-0000-000000000004','Dr. Rohan Das','General Medicine','9000000004','rohan@medicare.test',400);
INSERT INTO public.appointments (patient_id,doctor_id,appointment_date,appointment_time,reason,status) VALUES
('11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001','2026-10-12','10:00','Chest pain check-up','Scheduled'),
('11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000003','2026-10-10','11:30','Fever','Completed'),
('11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000002','2026-10-14','15:00','Knee pain','Scheduled'),
('11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000004','2026-10-08','09:30','Routine check','Cancelled');
INSERT INTO public.medicines (name,quantity,price,expiry_date) VALUES
('Paracetamol 500mg',250,2,'2027-06-30'),('Amoxicillin 250mg',80,8,'2026-12-31'),
('Cetirizine 10mg',15,3,'2027-03-15'),('Ibuprofen 400mg',120,4,'2026-10-20'),('ORS Sachet',60,20,'2027-09-01');
INSERT INTO public.bills (patient_id,items,subtotal,tax,total) VALUES
('11111111-0000-0000-0000-000000000005','[{"description":"Consultation","quantity":1,"price":500},{"description":"Paracetamol 500mg","quantity":10,"price":2}]',520,26,546),
('11111111-0000-0000-0000-000000000001','[{"description":"Consultation","quantity":1,"price":800},{"description":"ECG Test","quantity":1,"price":600}]',1400,70,1470);