-- Les 4 comptes créés le 14/07 (avant la migration RBAC du 18/07 et la
-- correction du trigger on_auth_user_created du 19/07) n'ont jamais reçu de
-- ligne profiles ni de rôle 'citoyen' : handle_new_user() n'était pas encore
-- câblée. Sans backfill, /parametres plante pour ces comptes (useProfile()
-- fait un .single() sur une ligne inexistante) et personne n'a de rôle
-- (is_admin()/is_staff() renvoient false pour tout le monde).

insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.user_roles (user_id, role)
select u.id, 'citoyen'
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id)
on conflict (user_id, role) do nothing;

-- Premier administrateur désigné par l'utilisateur.
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'jeanclaudearmelguyot@gmail.com'
on conflict (user_id, role) do nothing;
