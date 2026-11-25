-- =============================================================================
-- Redefinir a senha de um usuário pelo Admin (só gestor)
-- -----------------------------------------------------------------------------
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase (como o acessos.sql).
-- Depois disso, o botão "Redefinir senha" do Admin passa a funcionar para a opção
-- "Definir nova senha". A opção "Enviar link por e-mail" não precisa deste arquivo.
--
-- Segurança:
--   - a função confere public.is_gestor() (a mesma regra das outras funções do Admin);
--   - só usuários logados podem chamá-la (anônimo não);
--   - a senha é gravada criptografada (bcrypt), igual ao que o próprio Supabase faz.
-- =============================================================================
create or replace function public.admin_redefinir_senha(p_email text, p_senha text)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_id uuid;
begin
  if not coalesce(public.is_gestor(), false) then
    raise exception 'Só gestor pode redefinir senha.' using errcode = '42501';
  end if;
  if p_senha is null or length(p_senha) < 6 then
    raise exception 'A senha precisa ter pelo menos 6 caracteres.' using errcode = '22023';
  end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_id is null then
    raise exception 'Usuário não encontrado: %', p_email using errcode = 'P0002';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_id;
end;
$$;

revoke all on function public.admin_redefinir_senha(text, text) from public, anon;
grant execute on function public.admin_redefinir_senha(text, text) to authenticated;
