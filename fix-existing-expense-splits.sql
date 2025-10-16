-- Fix existing expenses that don't have expense splits
-- This will create expense splits for all existing expenses

-- Create expense splits for all existing expenses that don't have them
INSERT INTO public.expense_splits (expense_id, user_id, amount)
SELECT 
    e.id as expense_id,
    gm.user_id,
    e.amount / COUNT(gm.user_id) OVER (PARTITION BY e.id) as amount
FROM public.expenses e
JOIN public.group_members gm ON e.group_id = gm.group_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.expense_splits es 
    WHERE es.expense_id = e.id
);

-- Update the amount calculation to be more precise
UPDATE public.expense_splits 
SET amount = (
    SELECT e.amount / COUNT(es2.user_id) 
    FROM public.expenses e 
    JOIN public.expense_splits es2 ON e.id = es2.expense_id 
    WHERE es2.expense_id = expense_splits.expense_id
    GROUP BY e.amount
)
WHERE EXISTS (
    SELECT 1 FROM public.expenses e 
    WHERE e.id = expense_splits.expense_id
);
