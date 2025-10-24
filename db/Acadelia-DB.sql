--
-- PostgreSQL database dump
--

\restrict xLl5tqyrHBVn5J7cTWfrkXQzV1oLWrckt32corfrtA3PeOIBXin0GyPBgG7S5db

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: pgsodium; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA pgsodium;


ALTER SCHEMA pgsodium OWNER TO supabase_admin;

--
-- Name: pgsodium; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgsodium WITH SCHEMA pgsodium;


--
-- Name: EXTENSION pgsodium; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgsodium IS 'Pgsodium is a modern cryptography library for Postgres.';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pgjwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;


--
-- Name: EXTENSION pgjwt; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgjwt IS 'JSON Web Token API for Postgresql';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: actualizar_rol_usuario(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_rol_usuario() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_id INT;
    tiene_suscripcion_valida BOOLEAN;
BEGIN
    -- Obtener ID de usuario afectado
    user_id = CASE
        WHEN TG_OP = 'DELETE' THEN OLD.id_user
        ELSE NEW.id_user
    END;

    -- Verificar si existe AL MENOS UNA suscripción válida en CUALQUIER carrera
    SELECT EXISTS (
        SELECT 1 
        FROM suscripciones 
        WHERE id_user = user_id
        AND status IN ('active', 'paused')
        AND (next_billed_at > NOW() OR next_billed_at IS NULL)
    ) INTO tiene_suscripcion_valida;

    -- Actualizar rol GLOBAL
    IF tiene_suscripcion_valida THEN
        UPDATE perfil SET id_rol = 2 WHERE id_usuario = user_id;  -- Premium
    ELSE
        UPDATE perfil SET id_rol = 1 WHERE id_usuario = user_id;  -- Free
    END IF;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;


ALTER FUNCTION public.actualizar_rol_usuario() OWNER TO postgres;

--
-- Name: actualizar_rol_usuario_manual(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_rol_usuario_manual(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    tiene_suscripcion_valida BOOLEAN;
BEGIN
    -- Verificar si hay suscripciones válidas (active/paused)
    SELECT EXISTS (
        SELECT 1 
        FROM suscripciones 
        WHERE id_user = user_id
        AND status IN ('active', 'paused')
        AND (next_billed_at > NOW() OR next_billed_at IS NULL)
    ) INTO tiene_suscripcion_valida;

    -- Actualizar rol según el resultado
    IF tiene_suscripcion_valida THEN
        UPDATE perfil SET id_rol = 2 WHERE id_usuario = user_id;  -- Premium
    ELSE
        UPDATE perfil SET id_rol = 1 WHERE id_usuario = user_id;  -- Free
    END IF;
END;
$$;


ALTER FUNCTION public.actualizar_rol_usuario_manual(user_id integer) OWNER TO postgres;

--
-- Name: actualizar_suscripciones_vencidas(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.actualizar_suscripciones_vencidas() RETURNS TABLE(total_vencidas integer, usuarios_degradados integer, tiempo_ejecucion interval, detalles jsonb)
    LANGUAGE plpgsql
    AS $$
DECLARE
    hora_inicio TIMESTAMP;
    hora_fin TIMESTAMP;
    conteo_vencidas INTEGER := 0;
    conteo_degradados INTEGER := 0;
    usuarios_afectados INTEGER[];
    id_usuario_var INTEGER;
    detalles_usuarios JSONB := '[]'::JSONB;
    info_usuario JSONB;
BEGIN
    hora_inicio := NOW();
    
    -- Log inicio del proceso
    RAISE NOTICE 'Iniciando actualización de suscripciones vencidas a las %', hora_inicio;
    
    -- Actualizar suscripciones vencidas y capturar usuarios afectados
    WITH suscripciones_actualizadas AS (
        UPDATE subscriptions_arg 
        SET 
            status = 'expirado',
            updated_at = NOW()
        WHERE 
            status = 'activo' 
            AND end_date <= NOW()
        RETURNING user_id, carrera_id, id, end_date
    ),
    usuarios_afectados_cte AS (
        SELECT DISTINCT user_id FROM suscripciones_actualizadas
    )
    SELECT 
        COUNT(*)::INTEGER,
        ARRAY_AGG(DISTINCT sa.user_id)
    INTO 
        conteo_vencidas,
        usuarios_afectados
    FROM suscripciones_actualizadas sa;
    
    -- Si no hay suscripciones vencidas, retornar inmediatamente
    IF conteo_vencidas = 0 THEN
        hora_fin := NOW();
        RAISE NOTICE 'No se encontraron suscripciones vencidas';
        
        RETURN QUERY SELECT 
            0::INTEGER as total_vencidas,
            0::INTEGER as usuarios_degradados,
            (hora_fin - hora_inicio)::INTERVAL as tiempo_ejecucion,
            '{"mensaje": "No se encontraron suscripciones vencidas", "usuarios": []}'::JSONB as detalles;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Se vencieron % suscripciones para % usuarios', conteo_vencidas, array_length(usuarios_afectados, 1);
    
    -- Procesar cada usuario afectado
    FOREACH id_usuario_var IN ARRAY usuarios_afectados
    LOOP
        -- Verificar si el usuario tiene otras suscripciones activas
        DECLARE
            conteo_subs_activas INTEGER;
            correo_usuario VARCHAR;
            rol_actual INTEGER;
            rol_cambiado BOOLEAN := FALSE;
        BEGIN
            -- Contar suscripciones activas restantes
            SELECT COUNT(*) INTO conteo_subs_activas
            FROM subscriptions_arg 
            WHERE user_id = id_usuario_var AND status = 'activo';
            
            -- Obtener información del usuario
            SELECT u.correo, pf.id_rol 
            INTO correo_usuario, rol_actual
            FROM usuario u
            LEFT JOIN perfil pf ON u.id_user = pf.id_usuario
            WHERE u.id_user = id_usuario_var;
            
            -- Si no tiene suscripciones activas y no es rol básico, degradar a usuario básico
            IF conteo_subs_activas = 0 AND rol_actual != 1 THEN
                UPDATE perfil 
                SET id_rol = 1 
                WHERE id_usuario = id_usuario_var;
                
                rol_cambiado := TRUE;
                conteo_degradados := conteo_degradados + 1;
                
                RAISE NOTICE 'Usuario % (%) degradado de rol % a rol 1', id_usuario_var, correo_usuario, rol_actual;
            END IF;
            
            -- Agregar información del usuario a los detalles
            info_usuario := jsonb_build_object(
                'id_usuario', id_usuario_var,
                'correo', COALESCE(correo_usuario, 'Sin correo'),
                'suscripciones_activas_restantes', conteo_subs_activas,
                'rol_anterior', rol_actual,
                'rol_degradado', rol_cambiado
            );
            
            detalles_usuarios := detalles_usuarios || info_usuario;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error procesando usuario %: %', id_usuario_var, SQLERRM;
                -- Continuar con el siguiente usuario
                CONTINUE;
        END;
    END LOOP;
    
    hora_fin := NOW();
    
    RAISE NOTICE 'Proceso completado: % suscripciones vencidas, % usuarios degradados en %', 
                 conteo_vencidas, conteo_degradados, (hora_fin - hora_inicio);
    
    -- Retornar resultados
    RETURN QUERY SELECT 
        conteo_vencidas::INTEGER as total_vencidas,
        conteo_degradados::INTEGER as usuarios_degradados,
        (hora_fin - hora_inicio)::INTERVAL as tiempo_ejecucion,
        jsonb_build_object(
            'fecha_ejecucion', hora_fin,
            'suscripciones_vencidas', conteo_vencidas,
            'usuarios_procesados', array_length(usuarios_afectados, 1),
            'usuarios_degradados', conteo_degradados,
            'usuarios', detalles_usuarios
        ) as detalles;
END;
$$;


ALTER FUNCTION public.actualizar_suscripciones_vencidas() OWNER TO postgres;

--
-- Name: check_and_delete_old_chats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_and_delete_old_chats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    last_cleanup TIMESTAMP;
BEGIN
    -- Obtener la fecha de la última limpieza
    SELECT MAX(execution_date) INTO last_cleanup 
    FROM deletion_log;
    
    -- Si han pasado más de 30 días desde la última limpieza, ejecutar
    IF last_cleanup IS NULL OR (NOW() - last_cleanup) > INTERVAL '30 days' THEN
        PERFORM delete_soft_deleted_chats();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_and_delete_old_chats() OWNER TO postgres;

--
-- Name: cleanup_old_file_attachments(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_file_attachments(days_old integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM file_attachments 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND accessed_at < NOW() - INTERVAL '1 day' * (days_old / 2);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_file_attachments(days_old integer) OWNER TO postgres;

--
-- Name: cleanup_old_security_events(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_security_events() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Archivar eventos de más de 90 días
  UPDATE security_events
  SET archived = TRUE
  WHERE created_at < NOW() - INTERVAL '90 days' 
  AND archived = FALSE;
  
  -- Eliminar eventos de más de 1 año
  DELETE FROM security_events
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Eliminar intentos de login antiguos
  DELETE FROM login_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION public.cleanup_old_security_events() OWNER TO postgres;

--
-- Name: delete_soft_deleted_chats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_soft_deleted_chats() RETURNS TABLE(deleted_chats_count integer, deleted_history_count integer, execution_timestamp timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
    chat_count INTEGER := 0;
    history_count INTEGER := 0;
    chat_ids_to_delete UUID[];
BEGIN
    -- Obtener los IDs de chats que están marcados para eliminación
    SELECT ARRAY_AGG(id_chat) INTO chat_ids_to_delete
    FROM chat 
    WHERE is_deleted = true;
    
    -- Si no hay chats para eliminar, retornar ceros
    IF chat_ids_to_delete IS NULL OR array_length(chat_ids_to_delete, 1) = 0 THEN
        RETURN QUERY SELECT 0, 0, NOW()::TIMESTAMP;
        RETURN;
    END IF;
    
    -- Eliminar en orden: agentetube -> file_attachments -> chat_history -> chat
    
    -- 1. Eliminar de agentetube
    DELETE FROM agentetube 
    WHERE id_chat = ANY(chat_ids_to_delete);
    
    -- 2. Eliminar de file_attachments  
    DELETE FROM file_attachments 
    WHERE chat_id = ANY(chat_ids_to_delete);
    
    -- 3. Eliminar historial de chat
    DELETE FROM chat_history 
    WHERE id_chat = ANY(chat_ids_to_delete);
    
    GET DIAGNOSTICS history_count = ROW_COUNT;
    
    -- 4. Finalmente eliminar los chats
    DELETE FROM chat 
    WHERE is_deleted = true;
    
    GET DIAGNOSTICS chat_count = ROW_COUNT;
    
    -- Log de la operación
    INSERT INTO deletion_log (
        deleted_chats, 
        deleted_history, 
        execution_date
    ) VALUES (
        chat_count, 
        history_count, 
        NOW()
    );
    
    -- Retornar estadísticas
    RETURN QUERY SELECT chat_count, history_count, NOW()::TIMESTAMP;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error
        INSERT INTO deletion_log (
            deleted_chats, 
            deleted_history, 
            execution_date, 
            error_message
        ) VALUES (
            0, 
            0, 
            NOW(), 
            SQLERRM
        );
        RAISE;
END;
$$;


ALTER FUNCTION public.delete_soft_deleted_chats() OWNER TO postgres;

--
-- Name: evitar_duplicados_suscripciones(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.evitar_duplicados_suscripciones() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        IF EXISTS (
            SELECT 1
            FROM suscripciones
            WHERE id_user = NEW.id_user
            AND id_carrera = NEW.id_carrera
            AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'El usuario ya tiene una suscripción activa para esta carrera';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.evitar_duplicados_suscripciones() OWNER TO postgres;

--
-- Name: expirar_suscripciones(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.expirar_suscripciones() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    WITH expired_subs AS (
        SELECT id
        FROM suscripciones
        WHERE 
            next_billed_at < NOW()
            AND status = 'active'
    )
    UPDATE suscripciones
    SET status = 'expired'
    WHERE id IN (SELECT id FROM expired_subs);
END;
$$;


ALTER FUNCTION public.expirar_suscripciones() OWNER TO postgres;

--
-- Name: get_deletion_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_deletion_stats() RETURNS TABLE(total_executions bigint, total_chats_deleted bigint, total_history_deleted bigint, last_execution timestamp without time zone, avg_chats_per_execution numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        COUNT(*)::BIGINT as total_executions,
        SUM(deleted_chats)::BIGINT as total_chats_deleted,
        SUM(deleted_history)::BIGINT as total_history_deleted,
        MAX(execution_date) as last_execution,
        ROUND(AVG(deleted_chats), 2) as avg_chats_per_execution
    FROM deletion_log
    WHERE error_message IS NULL;
END;
$$;


ALTER FUNCTION public.get_deletion_stats() OWNER TO postgres;

--
-- Name: kw_match_anatomia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_anatomia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
begin
  return query execute
  format('select anatomia.id, anatomia.content, anatomia.metadata, ts_rank(to_tsvector(anatomia.content), plainto_tsquery($1)) as similarity
  from anatomia
  where to_tsvector(anatomia.content) @@ plainto_tsquery($1)
  order by similarity desc
  limit $2')
  using query_text, match_count;
end;
$_$;


ALTER FUNCTION public.kw_match_anatomia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_algebra(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_algebra(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_algebra.id, 
            emb_algebra.content, 
            emb_algebra.metadata, 
            ts_rank(to_tsvector(emb_algebra.content), plainto_tsquery($1)) AS similarity
          FROM emb_algebra
          WHERE to_tsvector(emb_algebra.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_algebra(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_calculo(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_calculo(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_calculo.id, 
            emb_calculo.content, 
            emb_calculo.metadata, 
            ts_rank(to_tsvector(emb_calculo.content), plainto_tsquery($1)) AS similarity
          FROM emb_calculo
          WHERE to_tsvector(emb_calculo.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_calculo(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_calculoeconomico(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_calculoeconomico(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_calculoeconomico.id, 
            emb_calculoeconomico.content, 
            emb_calculoeconomico.metadata, 
            ts_rank(to_tsvector(emb_calculoeconomico.content), plainto_tsquery($1)) AS similarity
          FROM emb_calculoeconomico
          WHERE to_tsvector(emb_calculoeconomico.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_calculoeconomico(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_cienciasaplicadas(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_cienciasaplicadas(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_cienciasaplicadas.id, 
            emb_cienciasaplicadas.content, 
            emb_cienciasaplicadas.metadata, 
            ts_rank(to_tsvector(emb_cienciasaplicadas.content), plainto_tsquery($1)) AS similarity
          FROM emb_cienciasaplicadas
          WHERE to_tsvector(emb_cienciasaplicadas.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_cienciasaplicadas(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_cienciasbasicas(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_cienciasbasicas(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_cienciasbasicas.id, 
            emb_cienciasbasicas.content, 
            emb_cienciasbasicas.metadata, 
            ts_rank(to_tsvector(emb_cienciasbasicas.content), plainto_tsquery($1)) AS similarity
          FROM emb_cienciasbasicas
          WHERE to_tsvector(emb_cienciasbasicas.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_cienciasbasicas(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_cirugia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_cirugia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_cirugia.id, 
            emb_cirugia.content, 
            emb_cirugia.metadata, 
            ts_rank(to_tsvector(emb_cirugia.content), plainto_tsquery($1)) AS similarity
          FROM emb_cirugia
          WHERE to_tsvector(emb_cirugia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_cirugia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_computacion(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_computacion(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_computacion.id, 
            emb_computacion.content, 
            emb_computacion.metadata, 
            ts_rank(to_tsvector(emb_computacion.content), plainto_tsquery($1)) AS similarity
          FROM emb_computacion
          WHERE to_tsvector(emb_computacion.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_computacion(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_desarrolloeconomico(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_desarrolloeconomico(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_desarrolloeconomico.id, 
            emb_desarrolloeconomico.content, 
            emb_desarrolloeconomico.metadata, 
            ts_rank(to_tsvector(emb_desarrolloeconomico.content), plainto_tsquery($1)) AS similarity
          FROM emb_desarrolloeconomico
          WHERE to_tsvector(emb_desarrolloeconomico.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_desarrolloeconomico(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_dsm5(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_dsm5(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_dsm5.id, 
            emb_dsm5.content, 
            emb_dsm5.metadata, 
            ts_rank(to_tsvector(emb_dsm5.content), plainto_tsquery($1)) AS similarity
          FROM emb_dsm5
          WHERE to_tsvector(emb_dsm5.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_dsm5(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_econometria(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_econometria(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_econometria.id, 
            emb_econometria.content, 
            emb_econometria.metadata, 
            ts_rank(to_tsvector(emb_econometria.content), plainto_tsquery($1)) AS similarity
          FROM emb_econometria
          WHERE to_tsvector(emb_econometria.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_econometria(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_economia_internacional(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_economia_internacional(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_economia_internacional.id, 
            emb_economia_internacional.content, 
            emb_economia_internacional.metadata, 
            ts_rank(to_tsvector(emb_economia_internacional.content), plainto_tsquery($1)) AS similarity
          FROM emb_economia_internacional
          WHERE to_tsvector(emb_economia_internacional.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_economia_internacional(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_economialaboral(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_economialaboral(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_economialaboral.id, 
            emb_economialaboral.content, 
            emb_economialaboral.metadata, 
            ts_rank(to_tsvector(emb_economialaboral.content), plainto_tsquery($1)) AS similarity
          FROM emb_economialaboral
          WHERE to_tsvector(emb_economialaboral.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_economialaboral(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_ej_53(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_ej_53(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_ej_53.id, 
            emb_ej_53.content, 
            emb_ej_53.metadata, 
            ts_rank(to_tsvector(emb_ej_53.content), plainto_tsquery($1)) AS similarity
          FROM emb_ej_53
          WHERE to_tsvector(emb_ej_53.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_ej_53(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_electricidad(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_electricidad(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_electricidad.id, 
            emb_electricidad.content, 
            emb_electricidad.metadata, 
            ts_rank(to_tsvector(emb_electricidad.content), plainto_tsquery($1)) AS similarity
          FROM emb_electricidad
          WHERE to_tsvector(emb_electricidad.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_electricidad(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_epidemiologia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_epidemiologia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_epidemiologia.id, 
            emb_epidemiologia.content, 
            emb_epidemiologia.metadata, 
            ts_rank(to_tsvector(emb_epidemiologia.content), plainto_tsquery($1)) AS similarity
          FROM emb_epidemiologia
          WHERE to_tsvector(emb_epidemiologia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_epidemiologia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_epistemologia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_epistemologia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_epistemologia.id, 
            emb_epistemologia.content, 
            emb_epistemologia.metadata, 
            ts_rank(to_tsvector(emb_epistemologia.content), plainto_tsquery($1)) AS similarity
          FROM emb_epistemologia
          WHERE to_tsvector(emb_epistemologia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_epistemologia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_especialidmed1(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_especialidmed1(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_especialidmed1.id, 
            emb_especialidmed1.content, 
            emb_especialidmed1.metadata, 
            ts_rank(to_tsvector(emb_especialidmed1.content), plainto_tsquery($1)) AS similarity
          FROM emb_especialidmed1
          WHERE to_tsvector(emb_especialidmed1.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_especialidmed1(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_especialidmed2(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_especialidmed2(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_especialidmed2.id, 
            emb_especialidmed2.content, 
            emb_especialidmed2.metadata, 
            ts_rank(to_tsvector(emb_especialidmed2.content), plainto_tsquery($1)) AS similarity
          FROM emb_especialidmed2
          WHERE to_tsvector(emb_especialidmed2.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_especialidmed2(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_estadistica(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_estadistica(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_estadistica.id, 
            emb_estadistica.content, 
            emb_estadistica.metadata, 
            ts_rank(to_tsvector(emb_estadistica.content), plainto_tsquery($1)) AS similarity
          FROM emb_estadistica
          WHERE to_tsvector(emb_estadistica.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_estadistica(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_finanzas(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_finanzas(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_finanzas.id, 
            emb_finanzas.content, 
            emb_finanzas.metadata, 
            ts_rank(to_tsvector(emb_finanzas.content), plainto_tsquery($1)) AS similarity
          FROM emb_finanzas
          WHERE to_tsvector(emb_finanzas.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_finanzas(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_historiaeconomica(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_historiaeconomica(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_historiaeconomica.id, 
            emb_historiaeconomica.content, 
            emb_historiaeconomica.metadata, 
            ts_rank(to_tsvector(emb_historiaeconomica.content), plainto_tsquery($1)) AS similarity
          FROM emb_historiaeconomica
          WHERE to_tsvector(emb_historiaeconomica.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_historiaeconomica(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_locuraabsoluta_52(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_locuraabsoluta_52(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_locuraabsoluta_52.id, 
            emb_locuraabsoluta_52.content, 
            emb_locuraabsoluta_52.metadata, 
            ts_rank(to_tsvector(emb_locuraabsoluta_52.content), plainto_tsquery($1)) AS similarity
          FROM emb_locuraabsoluta_52
          WHERE to_tsvector(emb_locuraabsoluta_52.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_locuraabsoluta_52(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_macroeconomia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_macroeconomia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_macroeconomia.id, 
            emb_macroeconomia.content, 
            emb_macroeconomia.metadata, 
            ts_rank(to_tsvector(emb_macroeconomia.content), plainto_tsquery($1)) AS similarity
          FROM emb_macroeconomia
          WHERE to_tsvector(emb_macroeconomia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_macroeconomia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_matematicaavz(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_matematicaavz(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_matematicaavz.id, 
            emb_matematicaavz.content, 
            emb_matematicaavz.metadata, 
            ts_rank(to_tsvector(emb_matematicaavz.content), plainto_tsquery($1)) AS similarity
          FROM emb_matematicaavz
          WHERE to_tsvector(emb_matematicaavz.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_matematicaavz(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_medicinainterna(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_medicinainterna(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_medicinainterna.id, 
            emb_medicinainterna.content, 
            emb_medicinainterna.metadata, 
            ts_rank(to_tsvector(emb_medicinainterna.content), plainto_tsquery($1)) AS similarity
          FROM emb_medicinainterna
          WHERE to_tsvector(emb_medicinainterna.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_medicinainterna(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_medicinamat(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_medicinamat(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_medicinamat.id, 
            emb_medicinamat.content, 
            emb_medicinamat.metadata, 
            ts_rank(to_tsvector(emb_medicinamat.content), plainto_tsquery($1)) AS similarity
          FROM emb_medicinamat
          WHERE to_tsvector(emb_medicinamat.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_medicinamat(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_microeconomia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_microeconomia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_microeconomia.id, 
            emb_microeconomia.content, 
            emb_microeconomia.metadata, 
            ts_rank(to_tsvector(emb_microeconomia.content), plainto_tsquery($1)) AS similarity
          FROM emb_microeconomia
          WHERE to_tsvector(emb_microeconomia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_microeconomia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_neuropsicologia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_neuropsicologia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_neuropsicologia.id, 
            emb_neuropsicologia.content, 
            emb_neuropsicologia.metadata, 
            ts_rank(to_tsvector(emb_neuropsicologia.content), plainto_tsquery($1)) AS similarity
          FROM emb_neuropsicologia
          WHERE to_tsvector(emb_neuropsicologia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_neuropsicologia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_psicdiagnostico(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_psicdiagnostico(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_psicdiagnostico.id, 
            emb_psicdiagnostico.content, 
            emb_psicdiagnostico.metadata, 
            ts_rank(to_tsvector(emb_psicdiagnostico.content), plainto_tsquery($1)) AS similarity
          FROM emb_psicdiagnostico
          WHERE to_tsvector(emb_psicdiagnostico.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_psicdiagnostico(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_psicoanalisis(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_psicoanalisis(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_psicoanalisis.id, 
            emb_psicoanalisis.content, 
            emb_psicoanalisis.metadata, 
            ts_rank(to_tsvector(emb_psicoanalisis.content), plainto_tsquery($1)) AS similarity
          FROM emb_psicoanalisis
          WHERE to_tsvector(emb_psicoanalisis.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_psicoanalisis(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_psicoestadistica(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_psicoestadistica(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_psicoestadistica.id, 
            emb_psicoestadistica.content, 
            emb_psicoestadistica.metadata, 
            ts_rank(to_tsvector(emb_psicoestadistica.content), plainto_tsquery($1)) AS similarity
          FROM emb_psicoestadistica
          WHERE to_tsvector(emb_psicoestadistica.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_psicoestadistica(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_psicologiaev(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_psicologiaev(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_psicologiaev.id, 
            emb_psicologiaev.content, 
            emb_psicologiaev.metadata, 
            ts_rank(to_tsvector(emb_psicologiaev.content), plainto_tsquery($1)) AS similarity
          FROM emb_psicologiaev
          WHERE to_tsvector(emb_psicologiaev.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_psicologiaev(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_psicologiageneral(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_psicologiageneral(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_psicologiageneral.id, 
            emb_psicologiageneral.content, 
            emb_psicologiageneral.metadata, 
            ts_rank(to_tsvector(emb_psicologiageneral.content), plainto_tsquery($1)) AS similarity
          FROM emb_psicologiageneral
          WHERE to_tsvector(emb_psicologiageneral.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_psicologiageneral(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_psicologiasocial(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_psicologiasocial(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_psicologiasocial.id, 
            emb_psicologiasocial.content, 
            emb_psicologiasocial.metadata, 
            ts_rank(to_tsvector(emb_psicologiasocial.content), plainto_tsquery($1)) AS similarity
          FROM emb_psicologiasocial
          WHERE to_tsvector(emb_psicologiasocial.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_psicologiasocial(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_psicopatologia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_psicopatologia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_psicopatologia.id, 
            emb_psicopatologia.content, 
            emb_psicopatologia.metadata, 
            ts_rank(to_tsvector(emb_psicopatologia.content), plainto_tsquery($1)) AS similarity
          FROM emb_psicopatologia
          WHERE to_tsvector(emb_psicopatologia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_psicopatologia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_quimica(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_quimica(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_quimica.id, 
            emb_quimica.content, 
            emb_quimica.metadata, 
            ts_rank(to_tsvector(emb_quimica.content), plainto_tsquery($1)) AS similarity
          FROM emb_quimica
          WHERE to_tsvector(emb_quimica.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_quimica(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_redes(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_redes(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_redes.id, 
            emb_redes.content, 
            emb_redes.metadata, 
            ts_rank(to_tsvector(emb_redes.content), plainto_tsquery($1)) AS similarity
          FROM emb_redes
          WHERE to_tsvector(emb_redes.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_redes(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_resismateriales(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_resismateriales(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_resismateriales.id, 
            emb_resismateriales.content, 
            emb_resismateriales.metadata, 
            ts_rank(to_tsvector(emb_resismateriales.content), plainto_tsquery($1)) AS similarity
          FROM emb_resismateriales
          WHERE to_tsvector(emb_resismateriales.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_resismateriales(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_sectorpublico(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_sectorpublico(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_sectorpublico.id, 
            emb_sectorpublico.content, 
            emb_sectorpublico.metadata, 
            ts_rank(to_tsvector(emb_sectorpublico.content), plainto_tsquery($1)) AS similarity
          FROM emb_sectorpublico
          WHERE to_tsvector(emb_sectorpublico.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_sectorpublico(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_emb_semiologia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_emb_semiologia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$
      BEGIN
        RETURN QUERY EXECUTE
        FORMAT('
          SELECT 
            emb_semiologia.id, 
            emb_semiologia.content, 
            emb_semiologia.metadata, 
            ts_rank(to_tsvector(emb_semiologia.content), plainto_tsquery($1)) AS similarity
          FROM emb_semiologia
          WHERE to_tsvector(emb_semiologia.content) @@ plainto_tsquery($1)
          ORDER BY similarity DESC
          LIMIT $2
        ')
        USING query_text, match_count;
      END;
      $_$;


ALTER FUNCTION public.kw_match_emb_semiologia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_fisica(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_fisica(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $_$begin
  return query execute
  format('select emb_fisica.id, emb_fisica.content, emb_fisica.metadata, ts_rank(to_tsvector(emb_fisica.content), plainto_tsquery($1)) as similarity
  from emb_fisica
  where to_tsvector(emb_fisica.content) @@ plainto_tsquery($1)
  order by similarity desc
  limit $2')
  using query_text, match_count;
end;$_$;


ALTER FUNCTION public.kw_match_fisica(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: kw_match_patologia(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.kw_match_patologia(query_text text, match_count integer) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity real)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    emb_patologia.id,
    emb_patologia.content,
    emb_patologia.metadata,
    ts_rank(to_tsvector('spanish', emb_patologia.content), plainto_tsquery('spanish', query_text))::real AS similarity
  FROM emb_patologia
  WHERE to_tsvector('spanish', emb_patologia.content) @@ plainto_tsquery('spanish', query_text)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.kw_match_patologia(query_text text, match_count integer) OWNER TO postgres;

--
-- Name: manual_cleanup_chats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.manual_cleanup_chats() RETURNS TABLE(deleted_chats integer, deleted_history integer, execution_time timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY SELECT * FROM delete_soft_deleted_chats();
END;
$$;


ALTER FUNCTION public.manual_cleanup_chats() OWNER TO postgres;

--
-- Name: match_agentetube(public.vector, integer, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_agentetube(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer DEFAULT 5) RETURNS TABLE(agentetube_id bigint, content text, metadata jsonb, similarity double precision, special_elements jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    agentetube.id AS agentetube_id,
    agentetube.content,
    agentetube.metadata,
    1 - (agentetube.embedding <=> query_embedding) AS similarity,
    agentetube.special_elements
  FROM agentetube
  WHERE agentetube.id_user = id_user_param
    AND agentetube.id_chat = id_chat_param
  ORDER BY agentetube.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.match_agentetube(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) OWNER TO postgres;

--
-- Name: match_anatomia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_anatomia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
begin
  return query
  select
    anatomia.id, -- Explicit table prefix
    anatomia.content,
    anatomia.metadata,
    1 - (anatomia.embedding <=> query_embedding) as similarity
  from anatomia
  where anatomia.metadata @> filter -- Explicit table prefix
  order by anatomia.embedding <=> query_embedding -- Explicit table prefix
  limit match_count;
end;
$$;


ALTER FUNCTION public.match_anatomia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_chat_history(public.vector, integer, integer, integer, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_chat_history(query_embedding public.vector, id_user_param integer DEFAULT NULL::integer, id_ava_param integer DEFAULT NULL::integer, id_herramienta_param integer DEFAULT NULL::integer, id_chat_param uuid DEFAULT NULL::uuid, match_count integer DEFAULT 5) RETURNS TABLE(id bigint, role text, message text, similarity double precision, msg_timestamp timestamp without time zone, is_multimodal boolean, id_ava integer, id_herramienta integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    chat_history.id,
    chat_history.role,
    chat_history.message, 
    (1 - (chat_history.embedding <=> query_embedding))::float as similarity,
    chat_history.timestamp as msg_timestamp,
    COALESCE(chat_history.is_multimodal, false) as is_multimodal,
    chat_history.id_ava,
    chat_history.id_herramienta
  FROM chat_history
  WHERE 
    chat_history.id_user = id_user_param AND
    chat_history.id_chat = id_chat_param AND
    (
      (id_ava_param IS NOT NULL AND chat_history.id_ava = id_ava_param)
      OR
      (id_herramienta_param IS NOT NULL AND chat_history.id_herramienta = id_herramienta_param)
    )
    AND (chat_history.status IS NULL OR chat_history.status != 'cancelled')
  ORDER BY chat_history.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.match_chat_history(query_embedding public.vector, id_user_param integer, id_ava_param integer, id_herramienta_param integer, id_chat_param uuid, match_count integer) OWNER TO postgres;

--
-- Name: match_emb_algebra(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_algebra(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_algebra.id,
          emb_algebra.content,
          emb_algebra.metadata,
          1 - (emb_algebra.embedding <=> query_embedding) AS similarity
        FROM emb_algebra
        WHERE emb_algebra.metadata @> filter
        ORDER BY emb_algebra.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_algebra(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_calculo(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_calculo(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_calculo.id,
          emb_calculo.content,
          emb_calculo.metadata,
          1 - (emb_calculo.embedding <=> query_embedding) AS similarity
        FROM emb_calculo
        WHERE emb_calculo.metadata @> filter
        ORDER BY emb_calculo.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_calculo(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_calculoeconomico(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_calculoeconomico(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_calculoeconomico.id,
          emb_calculoeconomico.content,
          emb_calculoeconomico.metadata,
          1 - (emb_calculoeconomico.embedding <=> query_embedding) AS similarity
        FROM emb_calculoeconomico
        WHERE emb_calculoeconomico.metadata @> filter
        ORDER BY emb_calculoeconomico.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_calculoeconomico(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_cienciasaplicadas(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_cienciasaplicadas(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_cienciasaplicadas.id,
          emb_cienciasaplicadas.content,
          emb_cienciasaplicadas.metadata,
          1 - (emb_cienciasaplicadas.embedding <=> query_embedding) AS similarity
        FROM emb_cienciasaplicadas
        WHERE emb_cienciasaplicadas.metadata @> filter
        ORDER BY emb_cienciasaplicadas.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_cienciasaplicadas(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_cienciasbasicas(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_cienciasbasicas(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_cienciasbasicas.id,
          emb_cienciasbasicas.content,
          emb_cienciasbasicas.metadata,
          1 - (emb_cienciasbasicas.embedding <=> query_embedding) AS similarity
        FROM emb_cienciasbasicas
        WHERE emb_cienciasbasicas.metadata @> filter
        ORDER BY emb_cienciasbasicas.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_cienciasbasicas(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_cirugia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_cirugia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_cirugia.id,
          emb_cirugia.content,
          emb_cirugia.metadata,
          1 - (emb_cirugia.embedding <=> query_embedding) AS similarity
        FROM emb_cirugia
        WHERE emb_cirugia.metadata @> filter
        ORDER BY emb_cirugia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_cirugia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_computacion(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_computacion(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_computacion.id,
          emb_computacion.content,
          emb_computacion.metadata,
          1 - (emb_computacion.embedding <=> query_embedding) AS similarity
        FROM emb_computacion
        WHERE emb_computacion.metadata @> filter
        ORDER BY emb_computacion.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_computacion(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_desarrolloeconomico(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_desarrolloeconomico(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_desarrolloeconomico.id,
          emb_desarrolloeconomico.content,
          emb_desarrolloeconomico.metadata,
          1 - (emb_desarrolloeconomico.embedding <=> query_embedding) AS similarity
        FROM emb_desarrolloeconomico
        WHERE emb_desarrolloeconomico.metadata @> filter
        ORDER BY emb_desarrolloeconomico.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_desarrolloeconomico(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_dsm5(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_dsm5(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_dsm5.id,
          emb_dsm5.content,
          emb_dsm5.metadata,
          1 - (emb_dsm5.embedding <=> query_embedding) AS similarity
        FROM emb_dsm5
        WHERE emb_dsm5.metadata @> filter
        ORDER BY emb_dsm5.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_dsm5(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_econometria(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_econometria(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_econometria.id,
          emb_econometria.content,
          emb_econometria.metadata,
          1 - (emb_econometria.embedding <=> query_embedding) AS similarity
        FROM emb_econometria
        WHERE emb_econometria.metadata @> filter
        ORDER BY emb_econometria.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_econometria(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_economia_internacional(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_economia_internacional(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_economia_internacional.id,
          emb_economia_internacional.content,
          emb_economia_internacional.metadata,
          1 - (emb_economia_internacional.embedding <=> query_embedding) AS similarity
        FROM emb_economia_internacional
        WHERE emb_economia_internacional.metadata @> filter
        ORDER BY emb_economia_internacional.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_economia_internacional(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_economialaboral(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_economialaboral(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_economialaboral.id,
          emb_economialaboral.content,
          emb_economialaboral.metadata,
          1 - (emb_economialaboral.embedding <=> query_embedding) AS similarity
        FROM emb_economialaboral
        WHERE emb_economialaboral.metadata @> filter
        ORDER BY emb_economialaboral.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_economialaboral(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_ej_53(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_ej_53(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_ej_53.id,
          emb_ej_53.content,
          emb_ej_53.metadata,
          1 - (emb_ej_53.embedding <=> query_embedding) AS similarity
        FROM emb_ej_53
        WHERE emb_ej_53.metadata @> filter
        ORDER BY emb_ej_53.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_ej_53(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_electricidad(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_electricidad(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_electricidad.id,
          emb_electricidad.content,
          emb_electricidad.metadata,
          1 - (emb_electricidad.embedding <=> query_embedding) AS similarity
        FROM emb_electricidad
        WHERE emb_electricidad.metadata @> filter
        ORDER BY emb_electricidad.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_electricidad(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_epidemiologia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_epidemiologia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_epidemiologia.id,
          emb_epidemiologia.content,
          emb_epidemiologia.metadata,
          1 - (emb_epidemiologia.embedding <=> query_embedding) AS similarity
        FROM emb_epidemiologia
        WHERE emb_epidemiologia.metadata @> filter
        ORDER BY emb_epidemiologia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_epidemiologia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_epistemologia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_epistemologia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_epistemologia.id,
          emb_epistemologia.content,
          emb_epistemologia.metadata,
          1 - (emb_epistemologia.embedding <=> query_embedding) AS similarity
        FROM emb_epistemologia
        WHERE emb_epistemologia.metadata @> filter
        ORDER BY emb_epistemologia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_epistemologia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_especialidmed1(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_especialidmed1(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_especialidmed1.id,
          emb_especialidmed1.content,
          emb_especialidmed1.metadata,
          1 - (emb_especialidmed1.embedding <=> query_embedding) AS similarity
        FROM emb_especialidmed1
        WHERE emb_especialidmed1.metadata @> filter
        ORDER BY emb_especialidmed1.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_especialidmed1(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_especialidmed2(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_especialidmed2(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_especialidmed2.id,
          emb_especialidmed2.content,
          emb_especialidmed2.metadata,
          1 - (emb_especialidmed2.embedding <=> query_embedding) AS similarity
        FROM emb_especialidmed2
        WHERE emb_especialidmed2.metadata @> filter
        ORDER BY emb_especialidmed2.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_especialidmed2(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_estadistica(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_estadistica(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_estadistica.id,
          emb_estadistica.content,
          emb_estadistica.metadata,
          1 - (emb_estadistica.embedding <=> query_embedding) AS similarity
        FROM emb_estadistica
        WHERE emb_estadistica.metadata @> filter
        ORDER BY emb_estadistica.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_estadistica(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_finanzas(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_finanzas(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_finanzas.id,
          emb_finanzas.content,
          emb_finanzas.metadata,
          1 - (emb_finanzas.embedding <=> query_embedding) AS similarity
        FROM emb_finanzas
        WHERE emb_finanzas.metadata @> filter
        ORDER BY emb_finanzas.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_finanzas(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_historiaeconomica(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_historiaeconomica(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_historiaeconomica.id,
          emb_historiaeconomica.content,
          emb_historiaeconomica.metadata,
          1 - (emb_historiaeconomica.embedding <=> query_embedding) AS similarity
        FROM emb_historiaeconomica
        WHERE emb_historiaeconomica.metadata @> filter
        ORDER BY emb_historiaeconomica.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_historiaeconomica(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_locuraabsoluta_52(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_locuraabsoluta_52(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_locuraabsoluta_52.id,
          emb_locuraabsoluta_52.content,
          emb_locuraabsoluta_52.metadata,
          1 - (emb_locuraabsoluta_52.embedding <=> query_embedding) AS similarity
        FROM emb_locuraabsoluta_52
        WHERE emb_locuraabsoluta_52.metadata @> filter
        ORDER BY emb_locuraabsoluta_52.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_locuraabsoluta_52(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_macroeconomia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_macroeconomia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_macroeconomia.id,
          emb_macroeconomia.content,
          emb_macroeconomia.metadata,
          1 - (emb_macroeconomia.embedding <=> query_embedding) AS similarity
        FROM emb_macroeconomia
        WHERE emb_macroeconomia.metadata @> filter
        ORDER BY emb_macroeconomia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_macroeconomia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_matematicaavz(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_matematicaavz(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_matematicaavz.id,
          emb_matematicaavz.content,
          emb_matematicaavz.metadata,
          1 - (emb_matematicaavz.embedding <=> query_embedding) AS similarity
        FROM emb_matematicaavz
        WHERE emb_matematicaavz.metadata @> filter
        ORDER BY emb_matematicaavz.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_matematicaavz(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_medicinainterna(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_medicinainterna(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_medicinainterna.id,
          emb_medicinainterna.content,
          emb_medicinainterna.metadata,
          1 - (emb_medicinainterna.embedding <=> query_embedding) AS similarity
        FROM emb_medicinainterna
        WHERE emb_medicinainterna.metadata @> filter
        ORDER BY emb_medicinainterna.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_medicinainterna(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_medicinamat(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_medicinamat(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_medicinamat.id,
          emb_medicinamat.content,
          emb_medicinamat.metadata,
          1 - (emb_medicinamat.embedding <=> query_embedding) AS similarity
        FROM emb_medicinamat
        WHERE emb_medicinamat.metadata @> filter
        ORDER BY emb_medicinamat.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_medicinamat(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_microeconomia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_microeconomia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_microeconomia.id,
          emb_microeconomia.content,
          emb_microeconomia.metadata,
          1 - (emb_microeconomia.embedding <=> query_embedding) AS similarity
        FROM emb_microeconomia
        WHERE emb_microeconomia.metadata @> filter
        ORDER BY emb_microeconomia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_microeconomia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_neuropsicologia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_neuropsicologia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_neuropsicologia.id,
          emb_neuropsicologia.content,
          emb_neuropsicologia.metadata,
          1 - (emb_neuropsicologia.embedding <=> query_embedding) AS similarity
        FROM emb_neuropsicologia
        WHERE emb_neuropsicologia.metadata @> filter
        ORDER BY emb_neuropsicologia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_neuropsicologia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_psicdiagnostico(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_psicdiagnostico(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_psicdiagnostico.id,
          emb_psicdiagnostico.content,
          emb_psicdiagnostico.metadata,
          1 - (emb_psicdiagnostico.embedding <=> query_embedding) AS similarity
        FROM emb_psicdiagnostico
        WHERE emb_psicdiagnostico.metadata @> filter
        ORDER BY emb_psicdiagnostico.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_psicdiagnostico(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_psicoanalisis(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_psicoanalisis(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_psicoanalisis.id,
          emb_psicoanalisis.content,
          emb_psicoanalisis.metadata,
          1 - (emb_psicoanalisis.embedding <=> query_embedding) AS similarity
        FROM emb_psicoanalisis
        WHERE emb_psicoanalisis.metadata @> filter
        ORDER BY emb_psicoanalisis.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_psicoanalisis(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_psicoestadistica(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_psicoestadistica(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_psicoestadistica.id,
          emb_psicoestadistica.content,
          emb_psicoestadistica.metadata,
          1 - (emb_psicoestadistica.embedding <=> query_embedding) AS similarity
        FROM emb_psicoestadistica
        WHERE emb_psicoestadistica.metadata @> filter
        ORDER BY emb_psicoestadistica.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_psicoestadistica(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_psicologiaev(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_psicologiaev(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_psicologiaev.id,
          emb_psicologiaev.content,
          emb_psicologiaev.metadata,
          1 - (emb_psicologiaev.embedding <=> query_embedding) AS similarity
        FROM emb_psicologiaev
        WHERE emb_psicologiaev.metadata @> filter
        ORDER BY emb_psicologiaev.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_psicologiaev(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_psicologiageneral(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_psicologiageneral(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_psicologiageneral.id,
          emb_psicologiageneral.content,
          emb_psicologiageneral.metadata,
          1 - (emb_psicologiageneral.embedding <=> query_embedding) AS similarity
        FROM emb_psicologiageneral
        WHERE emb_psicologiageneral.metadata @> filter
        ORDER BY emb_psicologiageneral.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_psicologiageneral(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_psicologiasocial(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_psicologiasocial(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_psicologiasocial.id,
          emb_psicologiasocial.content,
          emb_psicologiasocial.metadata,
          1 - (emb_psicologiasocial.embedding <=> query_embedding) AS similarity
        FROM emb_psicologiasocial
        WHERE emb_psicologiasocial.metadata @> filter
        ORDER BY emb_psicologiasocial.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_psicologiasocial(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_psicopatologia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_psicopatologia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_psicopatologia.id,
          emb_psicopatologia.content,
          emb_psicopatologia.metadata,
          1 - (emb_psicopatologia.embedding <=> query_embedding) AS similarity
        FROM emb_psicopatologia
        WHERE emb_psicopatologia.metadata @> filter
        ORDER BY emb_psicopatologia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_psicopatologia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_quimica(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_quimica(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_quimica.id,
          emb_quimica.content,
          emb_quimica.metadata,
          1 - (emb_quimica.embedding <=> query_embedding) AS similarity
        FROM emb_quimica
        WHERE emb_quimica.metadata @> filter
        ORDER BY emb_quimica.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_quimica(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_redes(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_redes(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_redes.id,
          emb_redes.content,
          emb_redes.metadata,
          1 - (emb_redes.embedding <=> query_embedding) AS similarity
        FROM emb_redes
        WHERE emb_redes.metadata @> filter
        ORDER BY emb_redes.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_redes(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_resismateriales(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_resismateriales(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_resismateriales.id,
          emb_resismateriales.content,
          emb_resismateriales.metadata,
          1 - (emb_resismateriales.embedding <=> query_embedding) AS similarity
        FROM emb_resismateriales
        WHERE emb_resismateriales.metadata @> filter
        ORDER BY emb_resismateriales.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_resismateriales(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_sectorpublico(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_sectorpublico(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_sectorpublico.id,
          emb_sectorpublico.content,
          emb_sectorpublico.metadata,
          1 - (emb_sectorpublico.embedding <=> query_embedding) AS similarity
        FROM emb_sectorpublico
        WHERE emb_sectorpublico.metadata @> filter
        ORDER BY emb_sectorpublico.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_sectorpublico(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_emb_semiologia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_emb_semiologia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
      #variable_conflict use_column
      BEGIN
        RETURN QUERY
        SELECT
          emb_semiologia.id,
          emb_semiologia.content,
          emb_semiologia.metadata,
          1 - (emb_semiologia.embedding <=> query_embedding) AS similarity
        FROM emb_semiologia
        WHERE emb_semiologia.metadata @> filter
        ORDER BY emb_semiologia.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;


ALTER FUNCTION public.match_emb_semiologia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_fisica(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_fisica(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$#variable_conflict use_column
begin
  return query
  select
    emb_fisica.id, -- Explicit table prefix
    emb_fisica.content,
    emb_fisica.metadata,
    1 - (emb_fisica.embedding <=> query_embedding) as similarity
  from emb_fisica
  where emb_fisica.metadata @> filter -- Explicit table prefix
  order by emb_fisica.embedding <=> query_embedding -- Explicit table prefix
  limit match_count;
end;$$;


ALTER FUNCTION public.match_fisica(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_marketing_contents(public.vector, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_marketing_contents(query_embedding public.vector, match_count integer) RETURNS TABLE(id uuid, type text, channel text, payload jsonb, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
  SELECT 
    c.id, c.type, c.channel, c.payload,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM marketing_contents c
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION public.match_marketing_contents(query_embedding public.vector, match_count integer) OWNER TO postgres;

--
-- Name: match_marketing_profiles(public.vector, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_marketing_profiles(query_embedding public.vector, match_count integer) RETURNS TABLE(id uuid, metadata jsonb, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
  SELECT 
    p.id, p.metadata,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM marketing_profiles p
  WHERE p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION public.match_marketing_profiles(query_embedding public.vector, match_count integer) OWNER TO postgres;

--
-- Name: match_patologia(public.vector, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_patologia(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    emb_patologia.id,
    emb_patologia.content,
    emb_patologia.metadata,
    1 - (emb_patologia.embedding <=> query_embedding) AS similarity
  FROM emb_patologia
  WHERE emb_patologia.metadata @> filter
  ORDER BY emb_patologia.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.match_patologia(query_embedding public.vector, match_count integer, filter jsonb) OWNER TO postgres;

--
-- Name: match_pdfs(public.vector, integer, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.match_pdfs(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer DEFAULT 5) RETURNS TABLE(pdf_id bigint, content text, metadata jsonb, similarity double precision, special_elements jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    pdfs.id AS pdf_id,
    pdfs.content,
    pdfs.metadata,
    1 - (pdfs.embedding <=> query_embedding) AS similarity,
    pdfs.special_elements
  FROM pdfs
  WHERE pdfs.id_user = id_user_param          -- Filtro por ID de usuario
    AND pdfs.id_chat = id_chat_param          -- Filtro por ID de chat
  ORDER BY pdfs.embedding <=> query_embedding   -- Ordenar por similitud
  LIMIT match_count;                            -- Limitar el número de resultados
END;
$$;


ALTER FUNCTION public.match_pdfs(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) OWNER TO postgres;

--
-- Name: obtener_estadisticas_suscripciones(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.obtener_estadisticas_suscripciones() RETURNS TABLE(total_suscripciones bigint, suscripciones_activas bigint, suscripciones_vencidas bigint, suscripciones_pendientes bigint, suscripciones_canceladas bigint, vencen_en_24h bigint, vencen_en_7d bigint)
    LANGUAGE sql
    AS $$
    SELECT 
        COUNT(*) as total_suscripciones,
        COUNT(*) FILTER (WHERE status = 'activo') as suscripciones_activas,
        COUNT(*) FILTER (WHERE status = 'expirado') as suscripciones_vencidas,
        COUNT(*) FILTER (WHERE status = 'pendiente') as suscripciones_pendientes,
        COUNT(*) FILTER (WHERE status = 'cancelado') as suscripciones_canceladas,
        COUNT(*) FILTER (WHERE status = 'activo' AND end_date <= NOW() + INTERVAL '1 day') as vencen_en_24h,
        COUNT(*) FILTER (WHERE status = 'activo' AND end_date <= NOW() + INTERVAL '7 days') as vencen_en_7d
    FROM subscriptions_arg;
$$;


ALTER FUNCTION public.obtener_estadisticas_suscripciones() OWNER TO postgres;

--
-- Name: rand_ts(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rand_ts(start_ts timestamp with time zone, end_ts timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT
    start_ts
    + (random() * (extract(EPOCH FROM (end_ts - start_ts))) ) * INTERVAL '1 second';
$$;


ALTER FUNCTION public.rand_ts(start_ts timestamp with time zone, end_ts timestamp with time zone) OWNER TO postgres;

--
-- Name: schedule_chat_cleanup(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.schedule_chat_cleanup() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Verificar si pg_cron está disponible
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Programar la tarea para ejecutarse cada 30 días a las 2:00 AM
        PERFORM cron.schedule(
            'delete-soft-deleted-chats',
            '0 2 1 * *', -- Cada primer día del mes a las 2:00 AM
            'SELECT delete_soft_deleted_chats();'
        );
    ELSE
        RAISE NOTICE 'pg_cron extension no está instalada. Usar método alternativo.';
    END IF;
END;
$$;


ALTER FUNCTION public.schedule_chat_cleanup() OWNER TO postgres;

--
-- Name: search_marketing_memory(public.vector, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_marketing_memory(query_embedding public.vector, memory_type text, match_count integer) RETURNS TABLE(id uuid, type text, content jsonb, importance double precision, similarity double precision)
    LANGUAGE sql STABLE
    AS $$
  SELECT 
    m.id, m.type, m.content, m.importance,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM marketing_memory m
  WHERE (memory_type IS NULL OR m.type = memory_type)
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION public.search_marketing_memory(query_embedding public.vector, memory_type text, match_count integer) OWNER TO postgres;

--
-- Name: update_chat_last_message_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_chat_last_message_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE chat
    SET last_message_date = NEW.timestamp
    WHERE id_chat = NEW.id_chat;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_chat_last_message_timestamp() OWNER TO postgres;

--
-- Name: update_file_attachments_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_file_attachments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_file_attachments_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION storage.add_prefixes(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION storage.delete_prefix(_bucket_id text, _name text) OWNER TO supabase_storage_admin;

--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION storage.delete_prefix_hierarchy_trigger() OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION storage.get_level(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION storage.get_prefix(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION storage.get_prefixes(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text) OWNER TO supabase_storage_admin;

--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_insert_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.objects_update_prefix_trigger() OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION storage.prefixes_insert_trigger() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$_$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_id text NOT NULL,
    client_secret_hash text NOT NULL,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: account_deletion_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_deletion_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    verification_code character varying(10) NOT NULL,
    token character varying(64) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    deletion_reason text
);


ALTER TABLE public.account_deletion_requests OWNER TO postgres;

--
-- Name: account_deletion_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.account_deletion_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_deletion_requests_id_seq OWNER TO postgres;

--
-- Name: account_deletion_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_deletion_requests_id_seq OWNED BY public.account_deletion_requests.id;


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id character varying(100) NOT NULL,
    entity_name character varying(255),
    description text,
    id_usuario integer,
    usuario_nombre character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_log_id_seq OWNER TO postgres;

--
-- Name: activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_log_id_seq OWNED BY public.activity_log.id;


--
-- Name: agentetube; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agentetube (
    id bigint NOT NULL,
    id_user integer NOT NULL,
    id_chat uuid NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    special_elements jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.agentetube OWNER TO postgres;

--
-- Name: agentetube_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agentetube_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.agentetube_id_seq OWNER TO postgres;

--
-- Name: agentetube_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agentetube_id_seq OWNED BY public.agentetube.id;


--
-- Name: analisis_impuestos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analisis_impuestos (
    id integer NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    country_code character varying(5) NOT NULL,
    tax_rate numeric(5,2) NOT NULL,
    taxable_amount numeric(12,2) NOT NULL,
    tax_amount numeric(12,2) NOT NULL,
    transaction_count integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.analisis_impuestos OWNER TO postgres;

--
-- Name: analisis_impuestos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analisis_impuestos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analisis_impuestos_id_seq OWNER TO postgres;

--
-- Name: analisis_impuestos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analisis_impuestos_id_seq OWNED BY public.analisis_impuestos.id;


--
-- Name: anatomia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.anatomia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536)
);


ALTER TABLE public.anatomia OWNER TO postgres;

--
-- Name: anatomia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.anatomia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anatomia_id_seq OWNER TO postgres;

--
-- Name: anatomia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.anatomia_id_seq OWNED BY public.anatomia.id;


--
-- Name: ava; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ava (
    id_ava integer NOT NULL,
    nom_ava character varying(150) NOT NULL,
    descripcion text,
    id_carrera integer NOT NULL,
    slug character varying(30),
    imagen character varying(255),
    embedding_table_name character varying(255)
);


ALTER TABLE public.ava OWNER TO postgres;

--
-- Name: ava_id_ava_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ava_id_ava_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ava_id_ava_seq OWNER TO postgres;

--
-- Name: ava_id_ava_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ava_id_ava_seq OWNED BY public.ava.id_ava;


--
-- Name: carrera; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carrera (
    id_carrera integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    month character varying,
    year character varying,
    imagen character varying(255),
    price_month_ars numeric(10,2),
    price_year_ars numeric(10,2)
);


ALTER TABLE public.carrera OWNER TO postgres;

--
-- Name: COLUMN carrera.descripcion; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.carrera.descripcion IS 'describe';


--
-- Name: COLUMN carrera.month; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.carrera.month IS 'mes';


--
-- Name: COLUMN carrera.year; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.carrera.year IS 'año';


--
-- Name: carrera_id_carrera_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.carrera_id_carrera_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.carrera_id_carrera_seq OWNER TO postgres;

--
-- Name: carrera_id_carrera_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.carrera_id_carrera_seq OWNED BY public.carrera.id_carrera;


--
-- Name: categorias_egresos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorias_egresos (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.categorias_egresos OWNER TO postgres;

--
-- Name: categorias_egresos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categorias_egresos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_egresos_id_seq OWNER TO postgres;

--
-- Name: categorias_egresos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categorias_egresos_id_seq OWNED BY public.categorias_egresos.id;


--
-- Name: chat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat (
    id_chat uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_ava integer,
    id_user integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    title text DEFAULT 'Nuevo Chat'::text NOT NULL,
    is_deleted boolean DEFAULT false,
    last_message_date timestamp without time zone DEFAULT now(),
    id_herramienta integer,
    CONSTRAINT check_ava_or_herramienta CHECK ((((id_ava IS NOT NULL) AND (id_herramienta IS NULL)) OR ((id_ava IS NULL) AND (id_herramienta IS NOT NULL))))
);


ALTER TABLE public.chat OWNER TO postgres;

--
-- Name: chat_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_history (
    id bigint NOT NULL,
    id_user integer NOT NULL,
    id_ava integer,
    id_chat uuid NOT NULL,
    role text NOT NULL,
    message text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    embedding public.vector(1536),
    is_multimodal boolean DEFAULT false,
    updated_at timestamp without time zone,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    has_pending_cancellation boolean DEFAULT false,
    cancellation_timestamp timestamp without time zone,
    id_herramienta integer,
    CONSTRAINT chat_history_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text]))),
    CONSTRAINT check_ava_or_herramienta CHECK ((((id_ava IS NOT NULL) AND (id_herramienta IS NULL)) OR ((id_ava IS NULL) AND (id_herramienta IS NOT NULL))))
);


ALTER TABLE public.chat_history OWNER TO postgres;

--
-- Name: COLUMN chat_history.id_ava; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.id_ava IS 'ID del avatar. Puede ser NULL cuando el chat usa una herramienta (id_herramienta en tabla chat)';


--
-- Name: COLUMN chat_history.message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.message IS 'Para mensajes normales: texto. Para multimodales: JSON con estructura de contenido';


--
-- Name: COLUMN chat_history.is_multimodal; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_history.is_multimodal IS 'Indica si el mensaje contiene contenido multimodal (imágenes, documentos, etc.)';


--
-- Name: chat_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_history_id_seq OWNER TO postgres;

--
-- Name: chat_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_history_id_seq OWNED BY public.chat_history.id;


--
-- Name: config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.config (
    key character varying(255) NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.config OWNER TO postgres;

--
-- Name: cookie_consent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cookie_consent (
    id integer NOT NULL,
    user_id integer,
    consent_token character varying(64) NOT NULL,
    ip_address character varying(45) NOT NULL,
    pais character varying(100),
    ciudad character varying(100),
    region character varying(100),
    ubicacion_completa text,
    essential boolean DEFAULT true NOT NULL,
    functional boolean DEFAULT false NOT NULL,
    analytics boolean DEFAULT false NOT NULL,
    marketing boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_agent text
);


ALTER TABLE public.cookie_consent OWNER TO postgres;

--
-- Name: cookie_consent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cookie_consent_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cookie_consent_id_seq OWNER TO postgres;

--
-- Name: cookie_consent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cookie_consent_id_seq OWNED BY public.cookie_consent.id;


--
-- Name: deleted_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deleted_accounts (
    id integer NOT NULL,
    email_hash character varying(64) NOT NULL,
    deletion_date timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text,
    ip_address character varying(45),
    deletion_reason text,
    subscription_active boolean
);


ALTER TABLE public.deleted_accounts OWNER TO postgres;

--
-- Name: deleted_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deleted_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deleted_accounts_id_seq OWNER TO postgres;

--
-- Name: deleted_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deleted_accounts_id_seq OWNED BY public.deleted_accounts.id;


--
-- Name: deletion_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deletion_log (
    id integer NOT NULL,
    deleted_chats integer DEFAULT 0 NOT NULL,
    deleted_history integer DEFAULT 0 NOT NULL,
    execution_date timestamp without time zone DEFAULT now() NOT NULL,
    error_message text
);


ALTER TABLE public.deletion_log OWNER TO postgres;

--
-- Name: deletion_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deletion_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deletion_log_id_seq OWNER TO postgres;

--
-- Name: deletion_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deletion_log_id_seq OWNED BY public.deletion_log.id;


--
-- Name: egresos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.egresos (
    id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    date date NOT NULL,
    category_id integer NOT NULL,
    payment_method character varying(50),
    reference character varying(100),
    tax_amount numeric(10,2),
    is_tax_deductible boolean DEFAULT false,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    invoice_url character varying(255)
);


ALTER TABLE public.egresos OWNER TO postgres;

--
-- Name: egresos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.egresos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.egresos_id_seq OWNER TO postgres;

--
-- Name: egresos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.egresos_id_seq OWNED BY public.egresos.id;


--
-- Name: emb_algebra; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_algebra (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_algebra OWNER TO postgres;

--
-- Name: emb_algebra_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_algebra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_algebra_id_seq OWNER TO postgres;

--
-- Name: emb_algebra_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_algebra_id_seq OWNED BY public.emb_algebra.id;


--
-- Name: emb_calculo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_calculo (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_calculo OWNER TO postgres;

--
-- Name: emb_calculo_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_calculo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_calculo_id_seq OWNER TO postgres;

--
-- Name: emb_calculo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_calculo_id_seq OWNED BY public.emb_calculo.id;


--
-- Name: emb_calculoeconomico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_calculoeconomico (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_calculoeconomico OWNER TO postgres;

--
-- Name: emb_calculoeconomico_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_calculoeconomico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_calculoeconomico_id_seq OWNER TO postgres;

--
-- Name: emb_calculoeconomico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_calculoeconomico_id_seq OWNED BY public.emb_calculoeconomico.id;


--
-- Name: emb_cienciasaplicadas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_cienciasaplicadas (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_cienciasaplicadas OWNER TO postgres;

--
-- Name: emb_cienciasaplicadas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_cienciasaplicadas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_cienciasaplicadas_id_seq OWNER TO postgres;

--
-- Name: emb_cienciasaplicadas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_cienciasaplicadas_id_seq OWNED BY public.emb_cienciasaplicadas.id;


--
-- Name: emb_cienciasbasicas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_cienciasbasicas (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_cienciasbasicas OWNER TO postgres;

--
-- Name: emb_cienciasbasicas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_cienciasbasicas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_cienciasbasicas_id_seq OWNER TO postgres;

--
-- Name: emb_cienciasbasicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_cienciasbasicas_id_seq OWNED BY public.emb_cienciasbasicas.id;


--
-- Name: emb_cirugia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_cirugia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_cirugia OWNER TO postgres;

--
-- Name: emb_cirugia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_cirugia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_cirugia_id_seq OWNER TO postgres;

--
-- Name: emb_cirugia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_cirugia_id_seq OWNED BY public.emb_cirugia.id;


--
-- Name: emb_computacion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_computacion (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_computacion OWNER TO postgres;

--
-- Name: emb_computacion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_computacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_computacion_id_seq OWNER TO postgres;

--
-- Name: emb_computacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_computacion_id_seq OWNED BY public.emb_computacion.id;


--
-- Name: emb_desarrolloeconomico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_desarrolloeconomico (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_desarrolloeconomico OWNER TO postgres;

--
-- Name: emb_desarrolloeconomico_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_desarrolloeconomico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_desarrolloeconomico_id_seq OWNER TO postgres;

--
-- Name: emb_desarrolloeconomico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_desarrolloeconomico_id_seq OWNED BY public.emb_desarrolloeconomico.id;


--
-- Name: emb_dsm5; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_dsm5 (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_dsm5 OWNER TO postgres;

--
-- Name: emb_dsm5_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_dsm5_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_dsm5_id_seq OWNER TO postgres;

--
-- Name: emb_dsm5_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_dsm5_id_seq OWNED BY public.emb_dsm5.id;


--
-- Name: emb_econometria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_econometria (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_econometria OWNER TO postgres;

--
-- Name: emb_econometria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_econometria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_econometria_id_seq OWNER TO postgres;

--
-- Name: emb_econometria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_econometria_id_seq OWNED BY public.emb_econometria.id;


--
-- Name: emb_economia_internacional; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_economia_internacional (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_economia_internacional OWNER TO postgres;

--
-- Name: emb_economia_internacional_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_economia_internacional_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_economia_internacional_id_seq OWNER TO postgres;

--
-- Name: emb_economia_internacional_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_economia_internacional_id_seq OWNED BY public.emb_economia_internacional.id;


--
-- Name: emb_economialaboral; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_economialaboral (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_economialaboral OWNER TO postgres;

--
-- Name: emb_economialaboral_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_economialaboral_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_economialaboral_id_seq OWNER TO postgres;

--
-- Name: emb_economialaboral_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_economialaboral_id_seq OWNED BY public.emb_economialaboral.id;


--
-- Name: emb_electricidad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_electricidad (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_electricidad OWNER TO postgres;

--
-- Name: emb_electricidad_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_electricidad_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_electricidad_id_seq OWNER TO postgres;

--
-- Name: emb_electricidad_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_electricidad_id_seq OWNED BY public.emb_electricidad.id;


--
-- Name: emb_epidemiologia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_epidemiologia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_epidemiologia OWNER TO postgres;

--
-- Name: emb_epidemiologia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_epidemiologia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_epidemiologia_id_seq OWNER TO postgres;

--
-- Name: emb_epidemiologia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_epidemiologia_id_seq OWNED BY public.emb_epidemiologia.id;


--
-- Name: emb_epistemologia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_epistemologia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_epistemologia OWNER TO postgres;

--
-- Name: emb_epistemologia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_epistemologia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_epistemologia_id_seq OWNER TO postgres;

--
-- Name: emb_epistemologia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_epistemologia_id_seq OWNED BY public.emb_epistemologia.id;


--
-- Name: emb_especialidmed1; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_especialidmed1 (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_especialidmed1 OWNER TO postgres;

--
-- Name: emb_especialidmed1_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_especialidmed1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_especialidmed1_id_seq OWNER TO postgres;

--
-- Name: emb_especialidmed1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_especialidmed1_id_seq OWNED BY public.emb_especialidmed1.id;


--
-- Name: emb_especialidmed2; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_especialidmed2 (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_especialidmed2 OWNER TO postgres;

--
-- Name: emb_especialidmed2_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_especialidmed2_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_especialidmed2_id_seq OWNER TO postgres;

--
-- Name: emb_especialidmed2_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_especialidmed2_id_seq OWNED BY public.emb_especialidmed2.id;


--
-- Name: emb_estadistica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_estadistica (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_estadistica OWNER TO postgres;

--
-- Name: emb_estadistica_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_estadistica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_estadistica_id_seq OWNER TO postgres;

--
-- Name: emb_estadistica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_estadistica_id_seq OWNED BY public.emb_estadistica.id;


--
-- Name: emb_finanzas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_finanzas (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_finanzas OWNER TO postgres;

--
-- Name: emb_finanzas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_finanzas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_finanzas_id_seq OWNER TO postgres;

--
-- Name: emb_finanzas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_finanzas_id_seq OWNED BY public.emb_finanzas.id;


--
-- Name: emb_fisica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_fisica (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.emb_fisica OWNER TO postgres;

--
-- Name: emb_historiaeconomica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_historiaeconomica (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_historiaeconomica OWNER TO postgres;

--
-- Name: emb_historiaeconomica_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_historiaeconomica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_historiaeconomica_id_seq OWNER TO postgres;

--
-- Name: emb_historiaeconomica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_historiaeconomica_id_seq OWNED BY public.emb_historiaeconomica.id;


--
-- Name: emb_macroeconomia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_macroeconomia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_macroeconomia OWNER TO postgres;

--
-- Name: emb_macroeconomia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_macroeconomia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_macroeconomia_id_seq OWNER TO postgres;

--
-- Name: emb_macroeconomia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_macroeconomia_id_seq OWNED BY public.emb_macroeconomia.id;


--
-- Name: emb_matematicaavz; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_matematicaavz (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_matematicaavz OWNER TO postgres;

--
-- Name: emb_matematicaavz_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_matematicaavz_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_matematicaavz_id_seq OWNER TO postgres;

--
-- Name: emb_matematicaavz_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_matematicaavz_id_seq OWNED BY public.emb_matematicaavz.id;


--
-- Name: emb_medicinainterna; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_medicinainterna (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_medicinainterna OWNER TO postgres;

--
-- Name: emb_medicinainterna_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_medicinainterna_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_medicinainterna_id_seq OWNER TO postgres;

--
-- Name: emb_medicinainterna_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_medicinainterna_id_seq OWNED BY public.emb_medicinainterna.id;


--
-- Name: emb_medicinamat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_medicinamat (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_medicinamat OWNER TO postgres;

--
-- Name: emb_medicinamat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_medicinamat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_medicinamat_id_seq OWNER TO postgres;

--
-- Name: emb_medicinamat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_medicinamat_id_seq OWNED BY public.emb_medicinamat.id;


--
-- Name: emb_microeconomia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_microeconomia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_microeconomia OWNER TO postgres;

--
-- Name: emb_microeconomia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_microeconomia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_microeconomia_id_seq OWNER TO postgres;

--
-- Name: emb_microeconomia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_microeconomia_id_seq OWNED BY public.emb_microeconomia.id;


--
-- Name: emb_neuropsicologia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_neuropsicologia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_neuropsicologia OWNER TO postgres;

--
-- Name: emb_neuropsicologia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_neuropsicologia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_neuropsicologia_id_seq OWNER TO postgres;

--
-- Name: emb_neuropsicologia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_neuropsicologia_id_seq OWNED BY public.emb_neuropsicologia.id;


--
-- Name: emb_patologia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_patologia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_patologia OWNER TO postgres;

--
-- Name: emb_psicdiagnostico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_psicdiagnostico (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_psicdiagnostico OWNER TO postgres;

--
-- Name: emb_psicdiagnostico_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_psicdiagnostico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_psicdiagnostico_id_seq OWNER TO postgres;

--
-- Name: emb_psicdiagnostico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_psicdiagnostico_id_seq OWNED BY public.emb_psicdiagnostico.id;


--
-- Name: emb_psicoanalisis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_psicoanalisis (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_psicoanalisis OWNER TO postgres;

--
-- Name: emb_psicoanalisis_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_psicoanalisis_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_psicoanalisis_id_seq OWNER TO postgres;

--
-- Name: emb_psicoanalisis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_psicoanalisis_id_seq OWNED BY public.emb_psicoanalisis.id;


--
-- Name: emb_psicoestadistica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_psicoestadistica (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_psicoestadistica OWNER TO postgres;

--
-- Name: emb_psicoestadistica_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_psicoestadistica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_psicoestadistica_id_seq OWNER TO postgres;

--
-- Name: emb_psicoestadistica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_psicoestadistica_id_seq OWNED BY public.emb_psicoestadistica.id;


--
-- Name: emb_psicologiaev; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_psicologiaev (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_psicologiaev OWNER TO postgres;

--
-- Name: emb_psicologiaev_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_psicologiaev_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_psicologiaev_id_seq OWNER TO postgres;

--
-- Name: emb_psicologiaev_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_psicologiaev_id_seq OWNED BY public.emb_psicologiaev.id;


--
-- Name: emb_psicologiageneral; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_psicologiageneral (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_psicologiageneral OWNER TO postgres;

--
-- Name: emb_psicologiageneral_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_psicologiageneral_id_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 0
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_psicologiageneral_id_seq OWNER TO postgres;

--
-- Name: emb_psicologiageneral_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_psicologiageneral_id_seq OWNED BY public.emb_psicologiageneral.id;


--
-- Name: emb_psicologiasocial; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_psicologiasocial (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_psicologiasocial OWNER TO postgres;

--
-- Name: emb_psicologiasocial_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_psicologiasocial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_psicologiasocial_id_seq OWNER TO postgres;

--
-- Name: emb_psicologiasocial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_psicologiasocial_id_seq OWNED BY public.emb_psicologiasocial.id;


--
-- Name: emb_psicopatologia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_psicopatologia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_psicopatologia OWNER TO postgres;

--
-- Name: emb_psicopatologia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_psicopatologia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_psicopatologia_id_seq OWNER TO postgres;

--
-- Name: emb_psicopatologia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_psicopatologia_id_seq OWNED BY public.emb_psicopatologia.id;


--
-- Name: emb_quimica; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_quimica (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_quimica OWNER TO postgres;

--
-- Name: emb_quimica_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_quimica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_quimica_id_seq OWNER TO postgres;

--
-- Name: emb_quimica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_quimica_id_seq OWNED BY public.emb_quimica.id;


--
-- Name: emb_redes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_redes (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_redes OWNER TO postgres;

--
-- Name: emb_redes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_redes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_redes_id_seq OWNER TO postgres;

--
-- Name: emb_redes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_redes_id_seq OWNED BY public.emb_redes.id;


--
-- Name: emb_resismateriales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_resismateriales (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_resismateriales OWNER TO postgres;

--
-- Name: emb_resismateriales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_resismateriales_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_resismateriales_id_seq OWNER TO postgres;

--
-- Name: emb_resismateriales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_resismateriales_id_seq OWNED BY public.emb_resismateriales.id;


--
-- Name: emb_sectorpublico; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_sectorpublico (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_sectorpublico OWNER TO postgres;

--
-- Name: emb_sectorpublico_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_sectorpublico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_sectorpublico_id_seq OWNER TO postgres;

--
-- Name: emb_sectorpublico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_sectorpublico_id_seq OWNED BY public.emb_sectorpublico.id;


--
-- Name: emb_semiologia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emb_semiologia (
    id bigint NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.emb_semiologia OWNER TO postgres;

--
-- Name: emb_semiologia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emb_semiologia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emb_semiologia_id_seq OWNER TO postgres;

--
-- Name: emb_semiologia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emb_semiologia_id_seq OWNED BY public.emb_semiologia.id;


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feedback (
    id integer NOT NULL,
    id_chat uuid NOT NULL,
    id_message bigint NOT NULL,
    id_user integer,
    type character varying(20) NOT NULL,
    feedback_text text,
    message_content text,
    email_sent boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT feedback_type_check CHECK (((type)::text = ANY (ARRAY[('positive'::character varying)::text, ('negative'::character varying)::text])))
);


ALTER TABLE public.feedback OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_id_seq OWNER TO postgres;

--
-- Name: feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_id_seq OWNED BY public.feedback.id;


--
-- Name: file_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.file_attachments (
    id integer NOT NULL,
    file_id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    user_id integer NOT NULL,
    original_name character varying(255) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_extension character varying(10) NOT NULL,
    attachment_type character varying(20) NOT NULL,
    extracted_content text,
    language character varying(50),
    is_scanned boolean DEFAULT false,
    scan_result jsonb,
    is_safe boolean DEFAULT true,
    is_processed boolean DEFAULT false,
    processing_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    accessed_at timestamp with time zone DEFAULT now(),
    CONSTRAINT file_attachments_attachment_type_check CHECK (((attachment_type)::text = ANY (ARRAY[('document'::character varying)::text, ('code'::character varying)::text, ('image'::character varying)::text])))
);


ALTER TABLE public.file_attachments OWNER TO postgres;

--
-- Name: TABLE file_attachments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.file_attachments IS 'Almacena información de archivos adjuntos del chat';


--
-- Name: COLUMN file_attachments.file_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.file_attachments.file_id IS 'UUID único para identificar el archivo';


--
-- Name: COLUMN file_attachments.extracted_content; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.file_attachments.extracted_content IS 'Contenido extraído de archivos de texto/código';


--
-- Name: COLUMN file_attachments.scan_result; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.file_attachments.scan_result IS 'Resultado del escaneo antivirus en formato JSON';


--
-- Name: COLUMN file_attachments.accessed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.file_attachments.accessed_at IS 'Última vez que se accedió al archivo';


--
-- Name: file_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.file_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_attachments_id_seq OWNER TO postgres;

--
-- Name: file_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.file_attachments_id_seq OWNED BY public.file_attachments.id;


--
-- Name: fisica_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fisica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fisica_id_seq OWNER TO postgres;

--
-- Name: fisica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fisica_id_seq OWNED BY public.emb_fisica.id;


--
-- Name: herramienta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.herramienta (
    id integer NOT NULL,
    nombre character varying(50),
    descripcion text,
    slug character varying(50),
    imagen character varying(255)
);


ALTER TABLE public.herramienta OWNER TO postgres;

--
-- Name: historial_transacciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historial_transacciones (
    id integer NOT NULL,
    transaction_id character varying(50) NOT NULL,
    price_id character varying(50) NOT NULL,
    product_id character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency_code character varying(3) NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    description text,
    "interval" character varying(50),
    product_name character varying(255) NOT NULL,
    payment_method character varying(50),
    last4 character varying(4),
    id_user integer,
    event_type character varying(50) NOT NULL,
    country_code character varying(2),
    tax_amount numeric,
    tax_rate numeric,
    fee_amount numeric,
    earnings numeric,
    exchange_rate numeric,
    amount_eur numeric,
    tax_amount_eur numeric,
    fee_amount_eur numeric,
    earnings_eur numeric,
    invoice_url character varying(512),
    user_deleted boolean DEFAULT false
);


ALTER TABLE public.historial_transacciones OWNER TO postgres;

--
-- Name: COLUMN historial_transacciones.country_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.country_code IS 'Código ISO de dos letras del país de origen de la transacción';


--
-- Name: COLUMN historial_transacciones.tax_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.tax_amount IS 'Monto de impuestos en la moneda original de la transacción';


--
-- Name: COLUMN historial_transacciones.tax_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.tax_rate IS 'Tasa impositiva aplicada (como decimal, ej: 0.21 para 21%)';


--
-- Name: COLUMN historial_transacciones.fee_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.fee_amount IS 'Monto de la tarifa de procesamiento en la moneda original';


--
-- Name: COLUMN historial_transacciones.earnings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.earnings IS 'Ingresos netos en la moneda original después de impuestos y tarifas';


--
-- Name: COLUMN historial_transacciones.exchange_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.exchange_rate IS 'Tasa de cambio a EUR en el momento de la transacción';


--
-- Name: COLUMN historial_transacciones.amount_eur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.amount_eur IS 'Monto total convertido a EUR';


--
-- Name: COLUMN historial_transacciones.tax_amount_eur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.tax_amount_eur IS 'Monto de impuestos convertido a EUR';


--
-- Name: COLUMN historial_transacciones.fee_amount_eur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.fee_amount_eur IS 'Monto de tarifa convertido a EUR';


--
-- Name: COLUMN historial_transacciones.earnings_eur; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.historial_transacciones.earnings_eur IS 'Ingresos netos convertidos a EUR';


--
-- Name: historial_transacciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historial_transacciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_transacciones_id_seq OWNER TO postgres;

--
-- Name: historial_transacciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historial_transacciones_id_seq OWNED BY public.historial_transacciones.id;


--
-- Name: informes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.informes (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    type character varying(50) NOT NULL,
    format character varying(20) NOT NULL,
    parameters jsonb,
    file_path character varying(255),
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    drive_url text
);


ALTER TABLE public.informes OWNER TO postgres;

--
-- Name: informes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.informes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.informes_id_seq OWNER TO postgres;

--
-- Name: informes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.informes_id_seq OWNED BY public.informes.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_attempts (
    id character varying(50) NOT NULL,
    user_id integer NOT NULL,
    verification_code character varying(6) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    CONSTRAINT status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text, ('completed'::character varying)::text, ('expired'::character varying)::text])))
);


ALTER TABLE public.login_attempts OWNER TO postgres;

--
-- Name: marketing_contents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketing_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    channel text NOT NULL,
    payload jsonb NOT NULL,
    embedding public.vector(1536) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.marketing_contents OWNER TO postgres;

--
-- Name: marketing_interactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketing_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    content_id uuid,
    channel text,
    action text,
    "timestamp" timestamp with time zone DEFAULT now()
);


ALTER TABLE public.marketing_interactions OWNER TO postgres;

--
-- Name: marketing_memory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketing_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    content jsonb NOT NULL,
    source text,
    importance double precision,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


ALTER TABLE public.marketing_memory OWNER TO postgres;

--
-- Name: marketing_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketing_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb NOT NULL,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.marketing_profiles OWNER TO postgres;

--
-- Name: marketing_trends; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.marketing_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    theme text NOT NULL,
    popularity double precision,
    metadata jsonb,
    embedding public.vector(1536),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.marketing_trends OWNER TO postgres;

--
-- Name: pais; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pais (
    id_pais integer NOT NULL,
    nombre_pais character varying(50) NOT NULL
);


ALTER TABLE public.pais OWNER TO postgres;

--
-- Name: pais_id_pais_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pais_id_pais_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pais_id_pais_seq OWNER TO postgres;

--
-- Name: pais_id_pais_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pais_id_pais_seq OWNED BY public.pais.id_pais;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    user_id integer NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: patologia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patologia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patologia_id_seq OWNER TO postgres;

--
-- Name: patologia_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patologia_id_seq OWNED BY public.emb_patologia.id;


--
-- Name: payments_arg; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments_arg (
    id integer NOT NULL,
    user_id integer,
    carrera_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'ARS'::character varying,
    payment_method character varying(50) NOT NULL,
    payment_status character varying(50) NOT NULL,
    billing_cycle character varying(20),
    external_payment_id character varying(255),
    external_payment_url text,
    transfer_details jsonb,
    transfer_image_url text,
    processed_by_admin_id integer,
    admin_notes text,
    payment_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_deleted boolean DEFAULT false,
    CONSTRAINT payments_arg_billing_cycle_check CHECK (((billing_cycle)::text = ANY (ARRAY[('month'::character varying)::text, ('year'::character varying)::text]))),
    CONSTRAINT payments_arg_payment_method_check CHECK (((payment_method)::text = ANY (ARRAY[('uala_bis'::character varying)::text, ('bank_transfer'::character varying)::text]))),
    CONSTRAINT payments_arg_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('pendiente'::character varying)::text, ('procesando'::character varying)::text, ('completado'::character varying)::text, ('fallido'::character varying)::text, ('expirado'::character varying)::text, ('en_revision_manual'::character varying)::text, ('rechazado'::character varying)::text])))
);


ALTER TABLE public.payments_arg OWNER TO postgres;

--
-- Name: payments_arg_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_arg_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_arg_id_seq OWNER TO postgres;

--
-- Name: payments_arg_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_arg_id_seq OWNED BY public.payments_arg.id;


--
-- Name: pdfs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pdfs (
    id bigint NOT NULL,
    id_user integer NOT NULL,
    id_chat uuid NOT NULL,
    content text,
    metadata jsonb,
    embedding public.vector(1536),
    special_elements jsonb DEFAULT '{"images": [], "tables": [], "formulas": []}'::jsonb
);


ALTER TABLE public.pdfs OWNER TO postgres;

--
-- Name: pdfs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pdfs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pdfs_id_seq OWNER TO postgres;

--
-- Name: pdfs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pdfs_id_seq OWNED BY public.pdfs.id;


--
-- Name: perfil; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.perfil (
    id_usuario integer NOT NULL,
    id_rol integer NOT NULL,
    nombre character varying(50),
    apellido character varying(50),
    id_pais integer,
    nacimiento date,
    id_universidad integer
);


ALTER TABLE public.perfil OWNER TO postgres;

--
-- Name: rol; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rol (
    id_rol integer NOT NULL,
    rol character varying(50) NOT NULL,
    descripcion text
);


ALTER TABLE public.rol OWNER TO postgres;

--
-- Name: rol_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rol_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rol_id_rol_seq OWNER TO postgres;

--
-- Name: rol_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rol_id_rol_seq OWNED BY public.rol.id_rol;


--
-- Name: scheduled_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scheduled_tasks (
    id integer NOT NULL,
    task_type character varying(50) NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now(),
    execute_at timestamp with time zone NOT NULL,
    executed_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    result jsonb
);


ALTER TABLE public.scheduled_tasks OWNER TO postgres;

--
-- Name: scheduled_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scheduled_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheduled_tasks_id_seq OWNER TO postgres;

--
-- Name: scheduled_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scheduled_tasks_id_seq OWNED BY public.scheduled_tasks.id;


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.security_events (
    id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    severity character varying(20) DEFAULT 'info'::character varying NOT NULL,
    user_id integer,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    archived boolean DEFAULT false
);


ALTER TABLE public.security_events OWNER TO postgres;

--
-- Name: security_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.security_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.security_events_id_seq OWNER TO postgres;

--
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
-- Name: subscriptions_arg; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions_arg (
    id integer NOT NULL,
    user_id integer NOT NULL,
    carrera_id integer NOT NULL,
    payment_id integer,
    status character varying(50) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subscriptions_arg_status_check CHECK (((status)::text = ANY (ARRAY[('activo'::character varying)::text, ('procesando'::character varying)::text, ('pausado'::character varying)::text, ('cancelado'::character varying)::text, ('expirado'::character varying)::text])))
);


ALTER TABLE public.subscriptions_arg OWNER TO postgres;

--
-- Name: subscriptions_arg_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_arg_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_arg_id_seq OWNER TO postgres;

--
-- Name: subscriptions_arg_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_arg_id_seq OWNED BY public.subscriptions_arg.id;


--
-- Name: suscripciones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suscripciones (
    id integer NOT NULL,
    customer_id character varying(255) NOT NULL,
    subscription_id character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    product_id character varying(255) NOT NULL,
    price_id character varying(255) NOT NULL,
    "interval" character varying(50) NOT NULL,
    product_name character varying(255),
    next_billed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    id_user integer,
    id_carrera integer,
    user_deleted boolean DEFAULT false
);


ALTER TABLE public.suscripciones OWNER TO postgres;

--
-- Name: suscripciones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suscripciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suscripciones_id_seq OWNER TO postgres;

--
-- Name: suscripciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suscripciones_id_seq OWNED BY public.suscripciones.id;


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    config_key character varying(50) NOT NULL,
    config_value jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: terms_acceptance_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.terms_acceptance_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    terms_version character varying(50) NOT NULL,
    token character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone
);


ALTER TABLE public.terms_acceptance_tokens OWNER TO postgres;

--
-- Name: terms_acceptance_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.terms_acceptance_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.terms_acceptance_tokens_id_seq OWNER TO postgres;

--
-- Name: terms_acceptance_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.terms_acceptance_tokens_id_seq OWNED BY public.terms_acceptance_tokens.id;


--
-- Name: terms_acceptances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.terms_acceptances (
    id integer NOT NULL,
    user_id integer NOT NULL,
    terms_version character varying(50) NOT NULL,
    accepted_at timestamp with time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent text,
    acceptance_method character varying(20) DEFAULT 'checkbox'::character varying
);


ALTER TABLE public.terms_acceptances OWNER TO postgres;

--
-- Name: terms_acceptances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.terms_acceptances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.terms_acceptances_id_seq OWNER TO postgres;

--
-- Name: terms_acceptances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.terms_acceptances_id_seq OWNED BY public.terms_acceptances.id;


--
-- Name: universidad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.universidad (
    id_universidad integer NOT NULL,
    nom_universidad character varying(150) NOT NULL,
    id_pais integer NOT NULL
);


ALTER TABLE public.universidad OWNER TO postgres;

--
-- Name: universidad_id_universidad_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.universidad_id_universidad_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.universidad_id_universidad_seq OWNER TO postgres;

--
-- Name: universidad_id_universidad_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.universidad_id_universidad_seq OWNED BY public.universidad.id_universidad;


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_user integer NOT NULL,
    "contraseña" character varying(150),
    correo character varying(150) NOT NULL,
    google_id character varying(255),
    last_login timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    email_verified boolean DEFAULT false,
    verification_token character varying(255),
    token_expiry timestamp without time zone
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- Name: usuario_id_user_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_user_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_user_seq OWNER TO postgres;

--
-- Name: usuario_id_user_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_user_seq OWNED BY public.usuario.id_user;


--
-- Name: webhook_events_arg; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_events_arg (
    event_id character varying(255) NOT NULL,
    payload jsonb,
    processed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.webhook_events_arg OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE storage.prefixes OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: account_deletion_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_deletion_requests ALTER COLUMN id SET DEFAULT nextval('public.account_deletion_requests_id_seq'::regclass);


--
-- Name: activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log ALTER COLUMN id SET DEFAULT nextval('public.activity_log_id_seq'::regclass);


--
-- Name: agentetube id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentetube ALTER COLUMN id SET DEFAULT nextval('public.agentetube_id_seq'::regclass);


--
-- Name: analisis_impuestos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analisis_impuestos ALTER COLUMN id SET DEFAULT nextval('public.analisis_impuestos_id_seq'::regclass);


--
-- Name: anatomia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anatomia ALTER COLUMN id SET DEFAULT nextval('public.anatomia_id_seq'::regclass);


--
-- Name: ava id_ava; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ava ALTER COLUMN id_ava SET DEFAULT nextval('public.ava_id_ava_seq'::regclass);


--
-- Name: carrera id_carrera; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrera ALTER COLUMN id_carrera SET DEFAULT nextval('public.carrera_id_carrera_seq'::regclass);


--
-- Name: categorias_egresos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_egresos ALTER COLUMN id SET DEFAULT nextval('public.categorias_egresos_id_seq'::regclass);


--
-- Name: chat_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history ALTER COLUMN id SET DEFAULT nextval('public.chat_history_id_seq'::regclass);


--
-- Name: cookie_consent id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cookie_consent ALTER COLUMN id SET DEFAULT nextval('public.cookie_consent_id_seq'::regclass);


--
-- Name: deleted_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deleted_accounts ALTER COLUMN id SET DEFAULT nextval('public.deleted_accounts_id_seq'::regclass);


--
-- Name: deletion_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_log ALTER COLUMN id SET DEFAULT nextval('public.deletion_log_id_seq'::regclass);


--
-- Name: egresos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresos ALTER COLUMN id SET DEFAULT nextval('public.egresos_id_seq'::regclass);


--
-- Name: emb_algebra id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_algebra ALTER COLUMN id SET DEFAULT nextval('public.emb_algebra_id_seq'::regclass);


--
-- Name: emb_calculo id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_calculo ALTER COLUMN id SET DEFAULT nextval('public.emb_calculo_id_seq'::regclass);


--
-- Name: emb_calculoeconomico id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_calculoeconomico ALTER COLUMN id SET DEFAULT nextval('public.emb_calculoeconomico_id_seq'::regclass);


--
-- Name: emb_cienciasaplicadas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_cienciasaplicadas ALTER COLUMN id SET DEFAULT nextval('public.emb_cienciasaplicadas_id_seq'::regclass);


--
-- Name: emb_cienciasbasicas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_cienciasbasicas ALTER COLUMN id SET DEFAULT nextval('public.emb_cienciasbasicas_id_seq'::regclass);


--
-- Name: emb_cirugia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_cirugia ALTER COLUMN id SET DEFAULT nextval('public.emb_cirugia_id_seq'::regclass);


--
-- Name: emb_computacion id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_computacion ALTER COLUMN id SET DEFAULT nextval('public.emb_computacion_id_seq'::regclass);


--
-- Name: emb_desarrolloeconomico id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_desarrolloeconomico ALTER COLUMN id SET DEFAULT nextval('public.emb_desarrolloeconomico_id_seq'::regclass);


--
-- Name: emb_dsm5 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_dsm5 ALTER COLUMN id SET DEFAULT nextval('public.emb_dsm5_id_seq'::regclass);


--
-- Name: emb_econometria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_econometria ALTER COLUMN id SET DEFAULT nextval('public.emb_econometria_id_seq'::regclass);


--
-- Name: emb_economia_internacional id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_economia_internacional ALTER COLUMN id SET DEFAULT nextval('public.emb_economia_internacional_id_seq'::regclass);


--
-- Name: emb_economialaboral id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_economialaboral ALTER COLUMN id SET DEFAULT nextval('public.emb_economialaboral_id_seq'::regclass);


--
-- Name: emb_electricidad id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_electricidad ALTER COLUMN id SET DEFAULT nextval('public.emb_electricidad_id_seq'::regclass);


--
-- Name: emb_epidemiologia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_epidemiologia ALTER COLUMN id SET DEFAULT nextval('public.emb_epidemiologia_id_seq'::regclass);


--
-- Name: emb_epistemologia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_epistemologia ALTER COLUMN id SET DEFAULT nextval('public.emb_epistemologia_id_seq'::regclass);


--
-- Name: emb_especialidmed1 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_especialidmed1 ALTER COLUMN id SET DEFAULT nextval('public.emb_especialidmed1_id_seq'::regclass);


--
-- Name: emb_especialidmed2 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_especialidmed2 ALTER COLUMN id SET DEFAULT nextval('public.emb_especialidmed2_id_seq'::regclass);


--
-- Name: emb_estadistica id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_estadistica ALTER COLUMN id SET DEFAULT nextval('public.emb_estadistica_id_seq'::regclass);


--
-- Name: emb_finanzas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_finanzas ALTER COLUMN id SET DEFAULT nextval('public.emb_finanzas_id_seq'::regclass);


--
-- Name: emb_fisica id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_fisica ALTER COLUMN id SET DEFAULT nextval('public.fisica_id_seq'::regclass);


--
-- Name: emb_historiaeconomica id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_historiaeconomica ALTER COLUMN id SET DEFAULT nextval('public.emb_historiaeconomica_id_seq'::regclass);


--
-- Name: emb_macroeconomia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_macroeconomia ALTER COLUMN id SET DEFAULT nextval('public.emb_macroeconomia_id_seq'::regclass);


--
-- Name: emb_matematicaavz id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_matematicaavz ALTER COLUMN id SET DEFAULT nextval('public.emb_matematicaavz_id_seq'::regclass);


--
-- Name: emb_medicinainterna id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_medicinainterna ALTER COLUMN id SET DEFAULT nextval('public.emb_medicinainterna_id_seq'::regclass);


--
-- Name: emb_medicinamat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_medicinamat ALTER COLUMN id SET DEFAULT nextval('public.emb_medicinamat_id_seq'::regclass);


--
-- Name: emb_microeconomia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_microeconomia ALTER COLUMN id SET DEFAULT nextval('public.emb_microeconomia_id_seq'::regclass);


--
-- Name: emb_neuropsicologia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_neuropsicologia ALTER COLUMN id SET DEFAULT nextval('public.emb_neuropsicologia_id_seq'::regclass);


--
-- Name: emb_patologia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_patologia ALTER COLUMN id SET DEFAULT nextval('public.patologia_id_seq'::regclass);


--
-- Name: emb_psicdiagnostico id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicdiagnostico ALTER COLUMN id SET DEFAULT nextval('public.emb_psicdiagnostico_id_seq'::regclass);


--
-- Name: emb_psicoanalisis id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicoanalisis ALTER COLUMN id SET DEFAULT nextval('public.emb_psicoanalisis_id_seq'::regclass);


--
-- Name: emb_psicoestadistica id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicoestadistica ALTER COLUMN id SET DEFAULT nextval('public.emb_psicoestadistica_id_seq'::regclass);


--
-- Name: emb_psicologiaev id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicologiaev ALTER COLUMN id SET DEFAULT nextval('public.emb_psicologiaev_id_seq'::regclass);


--
-- Name: emb_psicologiageneral id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicologiageneral ALTER COLUMN id SET DEFAULT nextval('public.emb_psicologiageneral_id_seq'::regclass);


--
-- Name: emb_psicologiasocial id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicologiasocial ALTER COLUMN id SET DEFAULT nextval('public.emb_psicologiasocial_id_seq'::regclass);


--
-- Name: emb_psicopatologia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicopatologia ALTER COLUMN id SET DEFAULT nextval('public.emb_psicopatologia_id_seq'::regclass);


--
-- Name: emb_quimica id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_quimica ALTER COLUMN id SET DEFAULT nextval('public.emb_quimica_id_seq'::regclass);


--
-- Name: emb_redes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_redes ALTER COLUMN id SET DEFAULT nextval('public.emb_redes_id_seq'::regclass);


--
-- Name: emb_resismateriales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_resismateriales ALTER COLUMN id SET DEFAULT nextval('public.emb_resismateriales_id_seq'::regclass);


--
-- Name: emb_sectorpublico id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_sectorpublico ALTER COLUMN id SET DEFAULT nextval('public.emb_sectorpublico_id_seq'::regclass);


--
-- Name: emb_semiologia id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_semiologia ALTER COLUMN id SET DEFAULT nextval('public.emb_semiologia_id_seq'::regclass);


--
-- Name: feedback id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback ALTER COLUMN id SET DEFAULT nextval('public.feedback_id_seq'::regclass);


--
-- Name: file_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments ALTER COLUMN id SET DEFAULT nextval('public.file_attachments_id_seq'::regclass);


--
-- Name: historial_transacciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_transacciones ALTER COLUMN id SET DEFAULT nextval('public.historial_transacciones_id_seq'::regclass);


--
-- Name: informes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.informes ALTER COLUMN id SET DEFAULT nextval('public.informes_id_seq'::regclass);


--
-- Name: pais id_pais; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pais ALTER COLUMN id_pais SET DEFAULT nextval('public.pais_id_pais_seq'::regclass);


--
-- Name: payments_arg id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments_arg ALTER COLUMN id SET DEFAULT nextval('public.payments_arg_id_seq'::regclass);


--
-- Name: pdfs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdfs ALTER COLUMN id SET DEFAULT nextval('public.pdfs_id_seq'::regclass);


--
-- Name: rol id_rol; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol ALTER COLUMN id_rol SET DEFAULT nextval('public.rol_id_rol_seq'::regclass);


--
-- Name: scheduled_tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_tasks ALTER COLUMN id SET DEFAULT nextval('public.scheduled_tasks_id_seq'::regclass);


--
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- Name: subscriptions_arg id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions_arg ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_arg_id_seq'::regclass);


--
-- Name: suscripciones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suscripciones ALTER COLUMN id SET DEFAULT nextval('public.suscripciones_id_seq'::regclass);


--
-- Name: terms_acceptance_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptance_tokens ALTER COLUMN id SET DEFAULT nextval('public.terms_acceptance_tokens_id_seq'::regclass);


--
-- Name: terms_acceptances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptances ALTER COLUMN id SET DEFAULT nextval('public.terms_acceptances_id_seq'::regclass);


--
-- Name: universidad id_universidad; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universidad ALTER COLUMN id_universidad SET DEFAULT nextval('public.universidad_id_universidad_seq'::regclass);


--
-- Name: usuario id_user; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_user SET DEFAULT nextval('public.usuario_id_user_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_client_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: account_deletion_requests account_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: agentetube agentetube_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentetube
    ADD CONSTRAINT agentetube_pkey PRIMARY KEY (id);


--
-- Name: analisis_impuestos analisis_impuestos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analisis_impuestos
    ADD CONSTRAINT analisis_impuestos_pkey PRIMARY KEY (id);


--
-- Name: anatomia anatomia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.anatomia
    ADD CONSTRAINT anatomia_pkey PRIMARY KEY (id);


--
-- Name: ava ava_nom_ava_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ava
    ADD CONSTRAINT ava_nom_ava_key UNIQUE (nom_ava);


--
-- Name: ava ava_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ava
    ADD CONSTRAINT ava_pkey PRIMARY KEY (id_ava);


--
-- Name: carrera carrera_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrera
    ADD CONSTRAINT carrera_nombre_key UNIQUE (nombre);


--
-- Name: carrera carrera_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carrera
    ADD CONSTRAINT carrera_pkey PRIMARY KEY (id_carrera);


--
-- Name: categorias_egresos categorias_egresos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorias_egresos
    ADD CONSTRAINT categorias_egresos_pkey PRIMARY KEY (id);


--
-- Name: chat_history chat_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_pkey PRIMARY KEY (id);


--
-- Name: chat chat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT chat_pkey PRIMARY KEY (id_chat);


--
-- Name: config config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.config
    ADD CONSTRAINT config_pkey PRIMARY KEY (key);


--
-- Name: cookie_consent cookie_consent_consent_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cookie_consent
    ADD CONSTRAINT cookie_consent_consent_token_key UNIQUE (consent_token);


--
-- Name: cookie_consent cookie_consent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cookie_consent
    ADD CONSTRAINT cookie_consent_pkey PRIMARY KEY (id);


--
-- Name: deleted_accounts deleted_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deleted_accounts
    ADD CONSTRAINT deleted_accounts_pkey PRIMARY KEY (id);


--
-- Name: deletion_log deletion_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_log
    ADD CONSTRAINT deletion_log_pkey PRIMARY KEY (id);


--
-- Name: egresos egresos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresos
    ADD CONSTRAINT egresos_pkey PRIMARY KEY (id);


--
-- Name: emb_algebra emb_algebra_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_algebra
    ADD CONSTRAINT emb_algebra_pkey PRIMARY KEY (id);


--
-- Name: emb_calculo emb_calculo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_calculo
    ADD CONSTRAINT emb_calculo_pkey PRIMARY KEY (id);


--
-- Name: emb_calculoeconomico emb_calculoeconomico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_calculoeconomico
    ADD CONSTRAINT emb_calculoeconomico_pkey PRIMARY KEY (id);


--
-- Name: emb_cienciasaplicadas emb_cienciasaplicadas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_cienciasaplicadas
    ADD CONSTRAINT emb_cienciasaplicadas_pkey PRIMARY KEY (id);


--
-- Name: emb_cienciasbasicas emb_cienciasbasicas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_cienciasbasicas
    ADD CONSTRAINT emb_cienciasbasicas_pkey PRIMARY KEY (id);


--
-- Name: emb_cirugia emb_cirugia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_cirugia
    ADD CONSTRAINT emb_cirugia_pkey PRIMARY KEY (id);


--
-- Name: emb_computacion emb_computacion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_computacion
    ADD CONSTRAINT emb_computacion_pkey PRIMARY KEY (id);


--
-- Name: emb_desarrolloeconomico emb_desarrolloeconomico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_desarrolloeconomico
    ADD CONSTRAINT emb_desarrolloeconomico_pkey PRIMARY KEY (id);


--
-- Name: emb_dsm5 emb_dsm5_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_dsm5
    ADD CONSTRAINT emb_dsm5_pkey PRIMARY KEY (id);


--
-- Name: emb_econometria emb_econometria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_econometria
    ADD CONSTRAINT emb_econometria_pkey PRIMARY KEY (id);


--
-- Name: emb_economia_internacional emb_economia_internacional_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_economia_internacional
    ADD CONSTRAINT emb_economia_internacional_pkey PRIMARY KEY (id);


--
-- Name: emb_economialaboral emb_economialaboral_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_economialaboral
    ADD CONSTRAINT emb_economialaboral_pkey PRIMARY KEY (id);


--
-- Name: emb_electricidad emb_electricidad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_electricidad
    ADD CONSTRAINT emb_electricidad_pkey PRIMARY KEY (id);


--
-- Name: emb_epidemiologia emb_epidemiologia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_epidemiologia
    ADD CONSTRAINT emb_epidemiologia_pkey PRIMARY KEY (id);


--
-- Name: emb_epistemologia emb_epistemologia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_epistemologia
    ADD CONSTRAINT emb_epistemologia_pkey PRIMARY KEY (id);


--
-- Name: emb_especialidmed1 emb_especialidmed1_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_especialidmed1
    ADD CONSTRAINT emb_especialidmed1_pkey PRIMARY KEY (id);


--
-- Name: emb_especialidmed2 emb_especialidmed2_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_especialidmed2
    ADD CONSTRAINT emb_especialidmed2_pkey PRIMARY KEY (id);


--
-- Name: emb_estadistica emb_estadistica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_estadistica
    ADD CONSTRAINT emb_estadistica_pkey PRIMARY KEY (id);


--
-- Name: emb_finanzas emb_finanzas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_finanzas
    ADD CONSTRAINT emb_finanzas_pkey PRIMARY KEY (id);


--
-- Name: emb_historiaeconomica emb_historiaeconomica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_historiaeconomica
    ADD CONSTRAINT emb_historiaeconomica_pkey PRIMARY KEY (id);


--
-- Name: emb_macroeconomia emb_macroeconomia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_macroeconomia
    ADD CONSTRAINT emb_macroeconomia_pkey PRIMARY KEY (id);


--
-- Name: emb_matematicaavz emb_matematicaavz_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_matematicaavz
    ADD CONSTRAINT emb_matematicaavz_pkey PRIMARY KEY (id);


--
-- Name: emb_medicinainterna emb_medicinainterna_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_medicinainterna
    ADD CONSTRAINT emb_medicinainterna_pkey PRIMARY KEY (id);


--
-- Name: emb_medicinamat emb_medicinamat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_medicinamat
    ADD CONSTRAINT emb_medicinamat_pkey PRIMARY KEY (id);


--
-- Name: emb_microeconomia emb_microeconomia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_microeconomia
    ADD CONSTRAINT emb_microeconomia_pkey PRIMARY KEY (id);


--
-- Name: emb_neuropsicologia emb_neuropsicologia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_neuropsicologia
    ADD CONSTRAINT emb_neuropsicologia_pkey PRIMARY KEY (id);


--
-- Name: emb_psicdiagnostico emb_psicdiagnostico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicdiagnostico
    ADD CONSTRAINT emb_psicdiagnostico_pkey PRIMARY KEY (id);


--
-- Name: emb_psicoanalisis emb_psicoanalisis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicoanalisis
    ADD CONSTRAINT emb_psicoanalisis_pkey PRIMARY KEY (id);


--
-- Name: emb_psicoestadistica emb_psicoestadistica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicoestadistica
    ADD CONSTRAINT emb_psicoestadistica_pkey PRIMARY KEY (id);


--
-- Name: emb_psicologiaev emb_psicologiaev_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicologiaev
    ADD CONSTRAINT emb_psicologiaev_pkey PRIMARY KEY (id);


--
-- Name: emb_psicologiageneral emb_psicologiageneral_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicologiageneral
    ADD CONSTRAINT emb_psicologiageneral_pkey PRIMARY KEY (id);


--
-- Name: emb_psicologiasocial emb_psicologiasocial_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicologiasocial
    ADD CONSTRAINT emb_psicologiasocial_pkey PRIMARY KEY (id);


--
-- Name: emb_psicopatologia emb_psicopatologia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_psicopatologia
    ADD CONSTRAINT emb_psicopatologia_pkey PRIMARY KEY (id);


--
-- Name: emb_quimica emb_quimica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_quimica
    ADD CONSTRAINT emb_quimica_pkey PRIMARY KEY (id);


--
-- Name: emb_redes emb_redes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_redes
    ADD CONSTRAINT emb_redes_pkey PRIMARY KEY (id);


--
-- Name: emb_resismateriales emb_resismateriales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_resismateriales
    ADD CONSTRAINT emb_resismateriales_pkey PRIMARY KEY (id);


--
-- Name: emb_sectorpublico emb_sectorpublico_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_sectorpublico
    ADD CONSTRAINT emb_sectorpublico_pkey PRIMARY KEY (id);


--
-- Name: emb_semiologia emb_semiologia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_semiologia
    ADD CONSTRAINT emb_semiologia_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: file_attachments file_attachments_file_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_file_id_key UNIQUE (file_id);


--
-- Name: file_attachments file_attachments_file_path_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_file_path_key UNIQUE (file_path);


--
-- Name: file_attachments file_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_pkey PRIMARY KEY (id);


--
-- Name: emb_fisica fisica_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_fisica
    ADD CONSTRAINT fisica_pkey PRIMARY KEY (id);


--
-- Name: herramienta herramienta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.herramienta
    ADD CONSTRAINT herramienta_pkey PRIMARY KEY (id);


--
-- Name: historial_transacciones historial_transacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_transacciones
    ADD CONSTRAINT historial_transacciones_pkey PRIMARY KEY (id);


--
-- Name: informes informes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: marketing_contents marketing_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_contents
    ADD CONSTRAINT marketing_contents_pkey PRIMARY KEY (id);


--
-- Name: marketing_interactions marketing_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_interactions
    ADD CONSTRAINT marketing_interactions_pkey PRIMARY KEY (id);


--
-- Name: marketing_memory marketing_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_memory
    ADD CONSTRAINT marketing_memory_pkey PRIMARY KEY (id);


--
-- Name: marketing_profiles marketing_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_profiles
    ADD CONSTRAINT marketing_profiles_pkey PRIMARY KEY (id);


--
-- Name: marketing_trends marketing_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_trends
    ADD CONSTRAINT marketing_trends_pkey PRIMARY KEY (id);


--
-- Name: pais pais_nombre_pais_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pais
    ADD CONSTRAINT pais_nombre_pais_key UNIQUE (nombre_pais);


--
-- Name: pais pais_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pais
    ADD CONSTRAINT pais_pkey PRIMARY KEY (id_pais);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (user_id);


--
-- Name: emb_patologia patologia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emb_patologia
    ADD CONSTRAINT patologia_pkey PRIMARY KEY (id);


--
-- Name: payments_arg payments_arg_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments_arg
    ADD CONSTRAINT payments_arg_pkey PRIMARY KEY (id);


--
-- Name: pdfs pdfs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdfs
    ADD CONSTRAINT pdfs_pkey PRIMARY KEY (id);


--
-- Name: perfil perfil_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfil
    ADD CONSTRAINT perfil_pkey PRIMARY KEY (id_usuario);


--
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);


--
-- Name: rol rol_rol_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rol
    ADD CONSTRAINT rol_rol_key UNIQUE (rol);


--
-- Name: scheduled_tasks scheduled_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_tasks
    ADD CONSTRAINT scheduled_tasks_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: subscriptions_arg subscriptions_arg_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions_arg
    ADD CONSTRAINT subscriptions_arg_pkey PRIMARY KEY (id);


--
-- Name: suscripciones suscripciones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_pkey PRIMARY KEY (id);


--
-- Name: suscripciones suscripciones_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_subscription_id_key UNIQUE (subscription_id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (config_key);


--
-- Name: terms_acceptance_tokens terms_acceptance_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptance_tokens
    ADD CONSTRAINT terms_acceptance_tokens_pkey PRIMARY KEY (id);


--
-- Name: terms_acceptance_tokens terms_acceptance_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptance_tokens
    ADD CONSTRAINT terms_acceptance_tokens_token_key UNIQUE (token);


--
-- Name: terms_acceptance_tokens terms_acceptance_tokens_user_id_terms_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptance_tokens
    ADD CONSTRAINT terms_acceptance_tokens_user_id_terms_version_key UNIQUE (user_id, terms_version);


--
-- Name: terms_acceptances terms_acceptances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptances
    ADD CONSTRAINT terms_acceptances_pkey PRIMARY KEY (id);


--
-- Name: terms_acceptances terms_acceptances_user_id_terms_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptances
    ADD CONSTRAINT terms_acceptances_user_id_terms_version_key UNIQUE (user_id, terms_version);


--
-- Name: account_deletion_requests unique_active_request; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT unique_active_request UNIQUE (user_id, token, status);


--
-- Name: universidad universidad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universidad
    ADD CONSTRAINT universidad_pkey PRIMARY KEY (id_universidad);


--
-- Name: usuario usuario_correo_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_correo_key UNIQUE (correo);


--
-- Name: usuario usuario_google_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_google_id_key UNIQUE (google_id);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_user);


--
-- Name: webhook_events_arg webhook_events_arg_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_events_arg
    ADD CONSTRAINT webhook_events_arg_pkey PRIMARY KEY (event_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_clients_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_client_id_idx ON auth.oauth_clients USING btree (client_id);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: emb_algebra_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_algebra_content_gin_idx ON public.emb_algebra USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_algebra_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_algebra_embedding_idx ON public.emb_algebra USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_algebra_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_algebra_metadata_idx ON public.emb_algebra USING gin (metadata);


--
-- Name: emb_calculo_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_calculo_content_gin_idx ON public.emb_calculo USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_calculo_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_calculo_embedding_idx ON public.emb_calculo USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_calculo_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_calculo_metadata_idx ON public.emb_calculo USING gin (metadata);


--
-- Name: emb_calculoeconomico_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_calculoeconomico_content_gin_idx ON public.emb_calculoeconomico USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_calculoeconomico_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_calculoeconomico_embedding_idx ON public.emb_calculoeconomico USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_calculoeconomico_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_calculoeconomico_metadata_idx ON public.emb_calculoeconomico USING gin (metadata);


--
-- Name: emb_cienciasaplicadas_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cienciasaplicadas_content_gin_idx ON public.emb_cienciasaplicadas USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_cienciasaplicadas_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cienciasaplicadas_embedding_idx ON public.emb_cienciasaplicadas USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_cienciasaplicadas_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cienciasaplicadas_metadata_idx ON public.emb_cienciasaplicadas USING gin (metadata);


--
-- Name: emb_cienciasbasicas_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cienciasbasicas_content_gin_idx ON public.emb_cienciasbasicas USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_cienciasbasicas_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cienciasbasicas_embedding_idx ON public.emb_cienciasbasicas USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_cienciasbasicas_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cienciasbasicas_metadata_idx ON public.emb_cienciasbasicas USING gin (metadata);


--
-- Name: emb_cirugia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cirugia_content_gin_idx ON public.emb_cirugia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_cirugia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cirugia_embedding_idx ON public.emb_cirugia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_cirugia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_cirugia_metadata_idx ON public.emb_cirugia USING gin (metadata);


--
-- Name: emb_computacion_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_computacion_content_gin_idx ON public.emb_computacion USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_computacion_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_computacion_embedding_idx ON public.emb_computacion USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_computacion_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_computacion_metadata_idx ON public.emb_computacion USING gin (metadata);


--
-- Name: emb_desarrolloeconomico_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_desarrolloeconomico_content_gin_idx ON public.emb_desarrolloeconomico USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_desarrolloeconomico_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_desarrolloeconomico_embedding_idx ON public.emb_desarrolloeconomico USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_desarrolloeconomico_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_desarrolloeconomico_metadata_idx ON public.emb_desarrolloeconomico USING gin (metadata);


--
-- Name: emb_dsm5_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_dsm5_content_gin_idx ON public.emb_dsm5 USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_dsm5_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_dsm5_embedding_idx ON public.emb_dsm5 USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_dsm5_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_dsm5_metadata_idx ON public.emb_dsm5 USING gin (metadata);


--
-- Name: emb_econometria_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_econometria_content_gin_idx ON public.emb_econometria USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_econometria_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_econometria_embedding_idx ON public.emb_econometria USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_econometria_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_econometria_metadata_idx ON public.emb_econometria USING gin (metadata);


--
-- Name: emb_economia_internacional_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_economia_internacional_content_gin_idx ON public.emb_economia_internacional USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_economia_internacional_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_economia_internacional_embedding_idx ON public.emb_economia_internacional USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_economia_internacional_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_economia_internacional_metadata_idx ON public.emb_economia_internacional USING gin (metadata);


--
-- Name: emb_economialaboral_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_economialaboral_content_gin_idx ON public.emb_economialaboral USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_economialaboral_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_economialaboral_embedding_idx ON public.emb_economialaboral USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_economialaboral_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_economialaboral_metadata_idx ON public.emb_economialaboral USING gin (metadata);


--
-- Name: emb_electricidad_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_electricidad_content_gin_idx ON public.emb_electricidad USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_electricidad_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_electricidad_embedding_idx ON public.emb_electricidad USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_electricidad_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_electricidad_metadata_idx ON public.emb_electricidad USING gin (metadata);


--
-- Name: emb_epidemiologia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_epidemiologia_content_gin_idx ON public.emb_epidemiologia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_epidemiologia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_epidemiologia_embedding_idx ON public.emb_epidemiologia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_epidemiologia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_epidemiologia_metadata_idx ON public.emb_epidemiologia USING gin (metadata);


--
-- Name: emb_epistemologia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_epistemologia_content_gin_idx ON public.emb_epistemologia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_epistemologia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_epistemologia_embedding_idx ON public.emb_epistemologia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_epistemologia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_epistemologia_metadata_idx ON public.emb_epistemologia USING gin (metadata);


--
-- Name: emb_especialidmed1_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_especialidmed1_content_gin_idx ON public.emb_especialidmed1 USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_especialidmed1_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_especialidmed1_embedding_idx ON public.emb_especialidmed1 USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_especialidmed1_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_especialidmed1_metadata_idx ON public.emb_especialidmed1 USING gin (metadata);


--
-- Name: emb_especialidmed2_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_especialidmed2_content_gin_idx ON public.emb_especialidmed2 USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_especialidmed2_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_especialidmed2_embedding_idx ON public.emb_especialidmed2 USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_especialidmed2_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_especialidmed2_metadata_idx ON public.emb_especialidmed2 USING gin (metadata);


--
-- Name: emb_estadistica_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_estadistica_content_gin_idx ON public.emb_estadistica USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_estadistica_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_estadistica_embedding_idx ON public.emb_estadistica USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_estadistica_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_estadistica_metadata_idx ON public.emb_estadistica USING gin (metadata);


--
-- Name: emb_finanzas_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_finanzas_content_gin_idx ON public.emb_finanzas USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_finanzas_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_finanzas_embedding_idx ON public.emb_finanzas USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_finanzas_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_finanzas_metadata_idx ON public.emb_finanzas USING gin (metadata);


--
-- Name: emb_fisica_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_fisica_content_gin_idx ON public.emb_fisica USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_fisica_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_fisica_embedding_idx ON public.emb_fisica USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='50');


--
-- Name: emb_fisica_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_fisica_metadata_idx ON public.emb_fisica USING gin (metadata);


--
-- Name: emb_historiaeconomica_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_historiaeconomica_content_gin_idx ON public.emb_historiaeconomica USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_historiaeconomica_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_historiaeconomica_embedding_idx ON public.emb_historiaeconomica USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_historiaeconomica_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_historiaeconomica_metadata_idx ON public.emb_historiaeconomica USING gin (metadata);


--
-- Name: emb_macroeconomia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_macroeconomia_content_gin_idx ON public.emb_macroeconomia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_macroeconomia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_macroeconomia_embedding_idx ON public.emb_macroeconomia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_macroeconomia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_macroeconomia_metadata_idx ON public.emb_macroeconomia USING gin (metadata);


--
-- Name: emb_matematicaavz_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_matematicaavz_content_gin_idx ON public.emb_matematicaavz USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_matematicaavz_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_matematicaavz_embedding_idx ON public.emb_matematicaavz USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_matematicaavz_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_matematicaavz_metadata_idx ON public.emb_matematicaavz USING gin (metadata);


--
-- Name: emb_medicinainterna_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_medicinainterna_content_gin_idx ON public.emb_medicinainterna USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_medicinainterna_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_medicinainterna_embedding_idx ON public.emb_medicinainterna USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_medicinainterna_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_medicinainterna_metadata_idx ON public.emb_medicinainterna USING gin (metadata);


--
-- Name: emb_medicinamat_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_medicinamat_content_gin_idx ON public.emb_medicinamat USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_medicinamat_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_medicinamat_embedding_idx ON public.emb_medicinamat USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_medicinamat_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_medicinamat_metadata_idx ON public.emb_medicinamat USING gin (metadata);


--
-- Name: emb_microeconomia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_microeconomia_content_gin_idx ON public.emb_microeconomia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_microeconomia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_microeconomia_embedding_idx ON public.emb_microeconomia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_microeconomia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_microeconomia_metadata_idx ON public.emb_microeconomia USING gin (metadata);


--
-- Name: emb_neuropsicologia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_neuropsicologia_content_gin_idx ON public.emb_neuropsicologia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_neuropsicologia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_neuropsicologia_embedding_idx ON public.emb_neuropsicologia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_neuropsicologia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_neuropsicologia_metadata_idx ON public.emb_neuropsicologia USING gin (metadata);


--
-- Name: emb_patologia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_patologia_content_gin_idx ON public.emb_patologia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_patologia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_patologia_embedding_idx ON public.emb_patologia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='50');


--
-- Name: emb_patologia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_patologia_metadata_idx ON public.emb_patologia USING gin (metadata);


--
-- Name: emb_psicdiagnostico_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicdiagnostico_content_gin_idx ON public.emb_psicdiagnostico USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_psicdiagnostico_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicdiagnostico_embedding_idx ON public.emb_psicdiagnostico USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_psicdiagnostico_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicdiagnostico_metadata_idx ON public.emb_psicdiagnostico USING gin (metadata);


--
-- Name: emb_psicoanalisis_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicoanalisis_embedding_idx ON public.emb_psicoanalisis USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_psicoestadistica_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicoestadistica_content_gin_idx ON public.emb_psicoestadistica USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_psicoestadistica_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicoestadistica_embedding_idx ON public.emb_psicoestadistica USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_psicoestadistica_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicoestadistica_metadata_idx ON public.emb_psicoestadistica USING gin (metadata);


--
-- Name: emb_psicologiaev_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiaev_content_gin_idx ON public.emb_psicologiaev USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_psicologiaev_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiaev_embedding_idx ON public.emb_psicologiaev USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_psicologiaev_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiaev_metadata_idx ON public.emb_psicologiaev USING gin (metadata);


--
-- Name: emb_psicologiageneral_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiageneral_content_gin_idx ON public.emb_psicologiageneral USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_psicologiageneral_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiageneral_embedding_idx ON public.emb_psicologiageneral USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_psicologiageneral_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiageneral_metadata_idx ON public.emb_psicologiageneral USING gin (metadata);


--
-- Name: emb_psicologiasocial_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiasocial_content_gin_idx ON public.emb_psicologiasocial USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_psicologiasocial_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiasocial_embedding_idx ON public.emb_psicologiasocial USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_psicologiasocial_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicologiasocial_metadata_idx ON public.emb_psicologiasocial USING gin (metadata);


--
-- Name: emb_psicopatologia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicopatologia_content_gin_idx ON public.emb_psicopatologia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_psicopatologia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicopatologia_embedding_idx ON public.emb_psicopatologia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_psicopatologia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_psicopatologia_metadata_idx ON public.emb_psicopatologia USING gin (metadata);


--
-- Name: emb_quimica_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_quimica_content_gin_idx ON public.emb_quimica USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_quimica_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_quimica_embedding_idx ON public.emb_quimica USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_quimica_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_quimica_metadata_idx ON public.emb_quimica USING gin (metadata);


--
-- Name: emb_redes_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_redes_content_gin_idx ON public.emb_redes USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_redes_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_redes_embedding_idx ON public.emb_redes USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_redes_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_redes_metadata_idx ON public.emb_redes USING gin (metadata);


--
-- Name: emb_resismateriales_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_resismateriales_content_gin_idx ON public.emb_resismateriales USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_resismateriales_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_resismateriales_embedding_idx ON public.emb_resismateriales USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_resismateriales_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_resismateriales_metadata_idx ON public.emb_resismateriales USING gin (metadata);


--
-- Name: emb_sectorpublico_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_sectorpublico_content_gin_idx ON public.emb_sectorpublico USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_sectorpublico_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_sectorpublico_embedding_idx ON public.emb_sectorpublico USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_sectorpublico_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_sectorpublico_metadata_idx ON public.emb_sectorpublico USING gin (metadata);


--
-- Name: emb_semiologia_content_gin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_semiologia_content_gin_idx ON public.emb_semiologia USING gin (to_tsvector('spanish'::regconfig, content));


--
-- Name: emb_semiologia_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_semiologia_embedding_idx ON public.emb_semiologia USING ivfflat (embedding public.vector_cosine_ops) WITH (lists='100');


--
-- Name: emb_semiologia_metadata_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX emb_semiologia_metadata_idx ON public.emb_semiologia USING gin (metadata);


--
-- Name: idx_ava_carrera_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ava_carrera_slug ON public.ava USING btree (id_carrera, slug);


--
-- Name: idx_ava_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_ava_slug ON public.ava USING btree (slug) WHERE (slug IS NOT NULL);


--
-- Name: idx_chat_ava; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_ava ON public.chat USING btree (id_ava) WHERE (id_ava IS NOT NULL);


--
-- Name: idx_chat_ava_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_ava_user ON public.chat USING btree (id_ava, id_user, created_at DESC) WHERE ((id_ava IS NOT NULL) AND (is_deleted = false));


--
-- Name: idx_chat_context_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_context_type ON public.chat USING btree (id_ava, id_herramienta);


--
-- Name: idx_chat_herramienta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_herramienta ON public.chat USING btree (id_herramienta) WHERE (id_herramienta IS NOT NULL);


--
-- Name: idx_chat_history_ava_herramienta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_ava_herramienta ON public.chat_history USING btree (id_ava, id_herramienta);


--
-- Name: idx_chat_history_chat_tokens; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_chat_tokens ON public.chat_history USING btree (id_chat, "timestamp", role) WHERE (role = ANY (ARRAY['user'::text, 'assistant'::text]));


--
-- Name: idx_chat_history_chat_user_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_chat_user_timestamp ON public.chat_history USING btree (id_chat, id_user, "timestamp" DESC, role) WHERE (role = 'user'::text);


--
-- Name: idx_chat_history_herramienta; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_herramienta ON public.chat_history USING btree (id_herramienta);


--
-- Name: idx_chat_history_id_chat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_id_chat ON public.chat_history USING btree (id_chat);


--
-- Name: idx_chat_history_status_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_status_timestamp ON public.chat_history USING btree (status, "timestamp") WHERE ((status)::text <> 'completed'::text);


--
-- Name: idx_chat_history_user_timestamp_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_history_user_timestamp_role ON public.chat_history USING btree (id_user, "timestamp" DESC, role) WHERE (role = 'user'::text);


--
-- Name: idx_chat_user_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_user_active ON public.chat USING btree (id_user, last_message_date DESC, is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_chat_user_ava; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_user_ava ON public.chat USING btree (id_user, id_ava);


--
-- Name: idx_cookie_consent_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cookie_consent_ip ON public.cookie_consent USING btree (ip_address);


--
-- Name: idx_cookie_consent_pais; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cookie_consent_pais ON public.cookie_consent USING btree (pais);


--
-- Name: idx_cookie_consent_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cookie_consent_token ON public.cookie_consent USING btree (consent_token);


--
-- Name: idx_cookie_consent_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cookie_consent_user_id ON public.cookie_consent USING btree (user_id);


--
-- Name: idx_deletion_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deletion_token ON public.account_deletion_requests USING btree (token);


--
-- Name: idx_deletion_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deletion_user_id ON public.account_deletion_requests USING btree (user_id);


--
-- Name: idx_file_attachments_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_attachments_chat_id ON public.file_attachments USING btree (chat_id);


--
-- Name: idx_file_attachments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_attachments_created_at ON public.file_attachments USING btree (created_at);


--
-- Name: idx_file_attachments_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_attachments_file_id ON public.file_attachments USING btree (file_id);


--
-- Name: idx_file_attachments_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_attachments_type ON public.file_attachments USING btree (attachment_type);


--
-- Name: idx_file_attachments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_file_attachments_user_id ON public.file_attachments USING btree (user_id);


--
-- Name: idx_herramienta_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_herramienta_slug ON public.herramienta USING btree (slug);


--
-- Name: idx_historial_transacciones_country_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_transacciones_country_code ON public.historial_transacciones USING btree (country_code);


--
-- Name: idx_historial_transacciones_currency_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_transacciones_currency_code ON public.historial_transacciones USING btree (currency_code);


--
-- Name: idx_historial_transacciones_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_transacciones_updated_at ON public.historial_transacciones USING btree (updated_at);


--
-- Name: idx_historial_user_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_user_product ON public.historial_transacciones USING btree (id_user, product_id, event_type);


--
-- Name: idx_historial_user_updated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_historial_user_updated ON public.historial_transacciones USING btree (id_user, updated_at DESC);


--
-- Name: idx_next_billed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_next_billed ON public.suscripciones USING btree (next_billed_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_pais_id_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pais_id_nombre ON public.pais USING btree (id_pais, nombre_pais);


--
-- Name: idx_pais_id_pais; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pais_id_pais ON public.pais USING btree (id_pais);


--
-- Name: idx_pais_nombre_pais; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pais_nombre_pais ON public.pais USING btree (nombre_pais);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_payments_admin_filter; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_admin_filter ON public.payments_arg USING btree (payment_status, payment_method, created_at DESC);


--
-- Name: idx_payments_arg_external_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_arg_external_id ON public.payments_arg USING btree (external_payment_id);


--
-- Name: idx_payments_arg_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_arg_status ON public.payments_arg USING btree (payment_status);


--
-- Name: idx_payments_arg_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_arg_user_id ON public.payments_arg USING btree (user_id);


--
-- Name: idx_payments_user_search; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_user_search ON public.payments_arg USING btree (user_id, created_at DESC);


--
-- Name: idx_pending_tasks; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_tasks ON public.scheduled_tasks USING btree (execute_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_perfil_busqueda; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_perfil_busqueda ON public.perfil USING btree (nombre, apellido);


--
-- Name: idx_perfil_completo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_perfil_completo ON public.perfil USING btree (id_usuario, id_rol, id_pais);


--
-- Name: idx_perfil_pais; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_perfil_pais ON public.perfil USING btree (id_pais);


--
-- Name: idx_perfil_rol; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_perfil_rol ON public.perfil USING btree (id_rol);


--
-- Name: idx_perfil_universidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_perfil_universidad ON public.perfil USING btree (id_universidad);


--
-- Name: idx_perfil_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_perfil_usuario ON public.perfil USING btree (id_usuario);


--
-- Name: idx_perfil_usuario_rol; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_perfil_usuario_rol ON public.perfil USING btree (id_usuario, id_rol);


--
-- Name: idx_security_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at);


--
-- Name: idx_security_events_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_event_type ON public.security_events USING btree (event_type);


--
-- Name: idx_security_events_ip_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_ip_address ON public.security_events USING btree (ip_address);


--
-- Name: idx_security_events_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_severity ON public.security_events USING btree (severity);


--
-- Name: idx_security_events_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id);


--
-- Name: idx_subscriptions_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_admin ON public.subscriptions_arg USING btree (status, created_at DESC);


--
-- Name: idx_subscriptions_arg_end_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_arg_end_date ON public.subscriptions_arg USING btree (end_date);


--
-- Name: idx_subscriptions_arg_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_arg_status ON public.subscriptions_arg USING btree (status);


--
-- Name: idx_subscriptions_arg_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subscriptions_arg_user_id ON public.subscriptions_arg USING btree (user_id);


--
-- Name: idx_suscripciones_activas; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suscripciones_activas ON public.suscripciones USING btree (id_user, next_billed_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_suscripciones_carrera_user_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suscripciones_carrera_user_active ON public.suscripciones USING btree (id_carrera, id_user, status, next_billed_at) WHERE ((status)::text = ANY (ARRAY[('active'::character varying)::text, ('paused'::character varying)::text]));


--
-- Name: idx_suscripciones_user_status_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suscripciones_user_status_active ON public.suscripciones USING btree (id_user, status, next_billed_at) WHERE ((status)::text = ANY (ARRAY[('active'::character varying)::text, ('paused'::character varying)::text]));


--
-- Name: idx_terms_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_terms_token ON public.terms_acceptance_tokens USING btree (token);


--
-- Name: idx_terms_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_terms_user_id ON public.terms_acceptances USING btree (user_id);


--
-- Name: idx_universidad_id_nombre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_universidad_id_nombre ON public.universidad USING btree (id_universidad, nom_universidad);


--
-- Name: idx_universidad_id_universidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_universidad_id_universidad ON public.universidad USING btree (id_universidad);


--
-- Name: idx_universidad_nom_universidad; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_universidad_nom_universidad ON public.universidad USING btree (nom_universidad);


--
-- Name: idx_universidad_pais; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_universidad_pais ON public.universidad USING btree (id_pais);


--
-- Name: idx_usuario_correo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_correo ON public.usuario USING btree (correo);


--
-- Name: idx_usuario_google_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_google_id ON public.usuario USING btree (google_id);


--
-- Name: idx_usuario_token_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usuario_token_expiry ON public.usuario USING btree (token_expiry) WHERE (token_expiry IS NOT NULL);


--
-- Name: idx_verification_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_verification_token ON public.usuario USING btree (verification_token);


--
-- Name: login_attempts_expires_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX login_attempts_expires_idx ON public.login_attempts USING btree (expires_at);


--
-- Name: login_attempts_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX login_attempts_status_idx ON public.login_attempts USING btree (status);


--
-- Name: login_attempts_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX login_attempts_user_id_idx ON public.login_attempts USING btree (user_id);


--
-- Name: unique_active_sub_per_user_carrera; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_active_sub_per_user_carrera ON public.subscriptions_arg USING btree (user_id, carrera_id) WHERE ((status)::text = 'activo'::text);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: suscripciones tr_actualizar_rol; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_actualizar_rol AFTER INSERT OR DELETE OR UPDATE OF status, next_billed_at ON public.suscripciones FOR EACH ROW EXECUTE FUNCTION public.actualizar_rol_usuario();


--
-- Name: suscripciones tr_eliminar_suscripcion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_eliminar_suscripcion AFTER DELETE ON public.suscripciones FOR EACH ROW EXECUTE FUNCTION public.actualizar_rol_usuario();


--
-- Name: suscripciones tr_evitar_duplicados; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_evitar_duplicados BEFORE INSERT ON public.suscripciones FOR EACH ROW EXECUTE FUNCTION public.evitar_duplicados_suscripciones();


--
-- Name: chat trigger_cleanup_old_chats; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_cleanup_old_chats AFTER INSERT OR UPDATE ON public.chat FOR EACH STATEMENT EXECUTE FUNCTION public.check_and_delete_old_chats();


--
-- Name: file_attachments trigger_update_file_attachments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_file_attachments_updated_at BEFORE UPDATE ON public.file_attachments FOR EACH ROW EXECUTE FUNCTION public.update_file_attachments_updated_at();


--
-- Name: chat_history update_chat_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_chat_timestamp AFTER INSERT ON public.chat_history FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message_timestamp();


--
-- Name: payments_arg update_payments_arg_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_payments_arg_updated_at BEFORE UPDATE ON public.payments_arg FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions_arg update_subscriptions_arg_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subscriptions_arg_updated_at BEFORE UPDATE ON public.subscriptions_arg FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: account_deletion_requests account_deletion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_deletion_requests
    ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_user);


--
-- Name: agentetube agentetube_id_chat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentetube
    ADD CONSTRAINT agentetube_id_chat_fkey FOREIGN KEY (id_chat) REFERENCES public.chat(id_chat);


--
-- Name: agentetube agentetube_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agentetube
    ADD CONSTRAINT agentetube_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.usuario(id_user);


--
-- Name: ava ava_id_carrera_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ava
    ADD CONSTRAINT ava_id_carrera_fkey FOREIGN KEY (id_carrera) REFERENCES public.carrera(id_carrera);


--
-- Name: chat_history chat_history_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT chat_history_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.usuario(id_user);


--
-- Name: chat chat_id_herramienta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT chat_id_herramienta_fkey FOREIGN KEY (id_herramienta) REFERENCES public.herramienta(id) ON DELETE SET NULL;


--
-- Name: chat chat_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT chat_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.usuario(id_user) ON DELETE CASCADE;


--
-- Name: cookie_consent cookie_consent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cookie_consent
    ADD CONSTRAINT cookie_consent_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user);


--
-- Name: egresos egresos_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresos
    ADD CONSTRAINT egresos_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categorias_egresos(id);


--
-- Name: egresos egresos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.egresos
    ADD CONSTRAINT egresos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuario(id_user);


--
-- Name: feedback feedback_id_chat_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_id_chat_fkey FOREIGN KEY (id_chat) REFERENCES public.chat(id_chat);


--
-- Name: feedback feedback_id_message_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_id_message_fkey FOREIGN KEY (id_message) REFERENCES public.chat_history(id);


--
-- Name: feedback feedback_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.usuario(id_user);


--
-- Name: chat fk_chat_ava; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat
    ADD CONSTRAINT fk_chat_ava FOREIGN KEY (id_ava) REFERENCES public.ava(id_ava) ON DELETE SET NULL;


--
-- Name: chat_history fk_chat_history_ava; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT fk_chat_history_ava FOREIGN KEY (id_ava) REFERENCES public.ava(id_ava) ON DELETE SET NULL;


--
-- Name: chat_history fk_chat_history_herramienta; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_history
    ADD CONSTRAINT fk_chat_history_herramienta FOREIGN KEY (id_herramienta) REFERENCES public.herramienta(id);


--
-- Name: file_attachments fk_file_attachments_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT fk_file_attachments_user_id FOREIGN KEY (user_id) REFERENCES public.usuario(id_user) ON DELETE CASCADE;


--
-- Name: suscripciones fk_suscripciones_carrera; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT fk_suscripciones_carrera FOREIGN KEY (id_carrera) REFERENCES public.carrera(id_carrera);


--
-- Name: historial_transacciones historial_transacciones_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historial_transacciones
    ADD CONSTRAINT historial_transacciones_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.usuario(id_user);


--
-- Name: informes informes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.informes
    ADD CONSTRAINT informes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuario(id_user);


--
-- Name: login_attempts login_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user);


--
-- Name: marketing_interactions marketing_interactions_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_interactions
    ADD CONSTRAINT marketing_interactions_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.marketing_contents(id);


--
-- Name: marketing_interactions marketing_interactions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.marketing_interactions
    ADD CONSTRAINT marketing_interactions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.marketing_profiles(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user) ON DELETE CASCADE;


--
-- Name: payments_arg payments_arg_carrera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments_arg
    ADD CONSTRAINT payments_arg_carrera_id_fkey FOREIGN KEY (carrera_id) REFERENCES public.carrera(id_carrera);


--
-- Name: payments_arg payments_arg_processed_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments_arg
    ADD CONSTRAINT payments_arg_processed_by_admin_id_fkey FOREIGN KEY (processed_by_admin_id) REFERENCES public.usuario(id_user);


--
-- Name: payments_arg payments_arg_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments_arg
    ADD CONSTRAINT payments_arg_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user);


--
-- Name: pdfs pdfs_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pdfs
    ADD CONSTRAINT pdfs_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.usuario(id_user);


--
-- Name: perfil perfil_id_pais_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfil
    ADD CONSTRAINT perfil_id_pais_fkey FOREIGN KEY (id_pais) REFERENCES public.pais(id_pais);


--
-- Name: perfil perfil_id_rol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfil
    ADD CONSTRAINT perfil_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol);


--
-- Name: perfil perfil_id_universidad_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfil
    ADD CONSTRAINT perfil_id_universidad_fkey FOREIGN KEY (id_universidad) REFERENCES public.universidad(id_universidad);


--
-- Name: perfil perfil_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.perfil
    ADD CONSTRAINT perfil_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_user);


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user);


--
-- Name: subscriptions_arg subscriptions_arg_carrera_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions_arg
    ADD CONSTRAINT subscriptions_arg_carrera_id_fkey FOREIGN KEY (carrera_id) REFERENCES public.carrera(id_carrera);


--
-- Name: subscriptions_arg subscriptions_arg_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions_arg
    ADD CONSTRAINT subscriptions_arg_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments_arg(id);


--
-- Name: subscriptions_arg subscriptions_arg_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions_arg
    ADD CONSTRAINT subscriptions_arg_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user);


--
-- Name: suscripciones suscripciones_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suscripciones
    ADD CONSTRAINT suscripciones_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.usuario(id_user);


--
-- Name: terms_acceptance_tokens terms_acceptance_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptance_tokens
    ADD CONSTRAINT terms_acceptance_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user);


--
-- Name: terms_acceptances terms_acceptances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.terms_acceptances
    ADD CONSTRAINT terms_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.usuario(id_user);


--
-- Name: universidad universidad_id_pais_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universidad
    ADD CONSTRAINT universidad_id_pais_fkey FOREIGN KEY (id_pais) REFERENCES public.pais(id_pais);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA cron; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA cron TO postgres WITH GRANT OPTION;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION halfvec_in(cstring, oid, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_in(cstring, oid, integer) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_in(cstring, oid, integer) TO anon;
GRANT ALL ON FUNCTION public.halfvec_in(cstring, oid, integer) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_in(cstring, oid, integer) TO service_role;


--
-- Name: FUNCTION halfvec_out(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_out(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_out(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_out(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_out(public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_recv(internal, oid, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_recv(internal, oid, integer) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_recv(internal, oid, integer) TO anon;
GRANT ALL ON FUNCTION public.halfvec_recv(internal, oid, integer) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_recv(internal, oid, integer) TO service_role;


--
-- Name: FUNCTION halfvec_send(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_send(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_send(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_send(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_send(public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_typmod_in(cstring[]); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_typmod_in(cstring[]) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_typmod_in(cstring[]) TO anon;
GRANT ALL ON FUNCTION public.halfvec_typmod_in(cstring[]) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_typmod_in(cstring[]) TO service_role;


--
-- Name: FUNCTION sparsevec_in(cstring, oid, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_in(cstring, oid, integer) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_in(cstring, oid, integer) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_in(cstring, oid, integer) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_in(cstring, oid, integer) TO service_role;


--
-- Name: FUNCTION sparsevec_out(public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_out(public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_out(public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_out(public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_out(public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_recv(internal, oid, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_recv(internal, oid, integer) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_recv(internal, oid, integer) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_recv(internal, oid, integer) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_recv(internal, oid, integer) TO service_role;


--
-- Name: FUNCTION sparsevec_send(public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_send(public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_send(public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_send(public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_send(public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_typmod_in(cstring[]); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_typmod_in(cstring[]) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_typmod_in(cstring[]) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_typmod_in(cstring[]) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_typmod_in(cstring[]) TO service_role;


--
-- Name: FUNCTION vector_in(cstring, oid, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_in(cstring, oid, integer) TO postgres;
GRANT ALL ON FUNCTION public.vector_in(cstring, oid, integer) TO anon;
GRANT ALL ON FUNCTION public.vector_in(cstring, oid, integer) TO authenticated;
GRANT ALL ON FUNCTION public.vector_in(cstring, oid, integer) TO service_role;


--
-- Name: FUNCTION vector_out(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_out(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_out(public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_out(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_out(public.vector) TO service_role;


--
-- Name: FUNCTION vector_recv(internal, oid, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_recv(internal, oid, integer) TO postgres;
GRANT ALL ON FUNCTION public.vector_recv(internal, oid, integer) TO anon;
GRANT ALL ON FUNCTION public.vector_recv(internal, oid, integer) TO authenticated;
GRANT ALL ON FUNCTION public.vector_recv(internal, oid, integer) TO service_role;


--
-- Name: FUNCTION vector_send(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_send(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_send(public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_send(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_send(public.vector) TO service_role;


--
-- Name: FUNCTION vector_typmod_in(cstring[]); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_typmod_in(cstring[]) TO postgres;
GRANT ALL ON FUNCTION public.vector_typmod_in(cstring[]) TO anon;
GRANT ALL ON FUNCTION public.vector_typmod_in(cstring[]) TO authenticated;
GRANT ALL ON FUNCTION public.vector_typmod_in(cstring[]) TO service_role;


--
-- Name: FUNCTION array_to_halfvec(real[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_halfvec(real[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_halfvec(real[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_halfvec(real[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_halfvec(real[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_sparsevec(real[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(real[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_sparsevec(real[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_sparsevec(real[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_sparsevec(real[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_vector(real[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_vector(real[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_vector(real[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_vector(real[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_vector(real[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_halfvec(double precision[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_halfvec(double precision[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_halfvec(double precision[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_halfvec(double precision[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_halfvec(double precision[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_sparsevec(double precision[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(double precision[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_sparsevec(double precision[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_sparsevec(double precision[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_sparsevec(double precision[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_vector(double precision[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_vector(double precision[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_vector(double precision[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_vector(double precision[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_vector(double precision[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_halfvec(integer[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_halfvec(integer[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_halfvec(integer[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_halfvec(integer[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_halfvec(integer[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_sparsevec(integer[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(integer[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_sparsevec(integer[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_sparsevec(integer[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_sparsevec(integer[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_vector(integer[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_vector(integer[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_vector(integer[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_vector(integer[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_vector(integer[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_halfvec(numeric[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_halfvec(numeric[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_halfvec(numeric[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_halfvec(numeric[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_halfvec(numeric[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_sparsevec(numeric[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(numeric[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_sparsevec(numeric[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_sparsevec(numeric[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_sparsevec(numeric[], integer, boolean) TO service_role;


--
-- Name: FUNCTION array_to_vector(numeric[], integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.array_to_vector(numeric[], integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.array_to_vector(numeric[], integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.array_to_vector(numeric[], integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.array_to_vector(numeric[], integer, boolean) TO service_role;


--
-- Name: FUNCTION halfvec_to_float4(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_to_float4(public.halfvec, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_to_float4(public.halfvec, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.halfvec_to_float4(public.halfvec, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_to_float4(public.halfvec, integer, boolean) TO service_role;


--
-- Name: FUNCTION halfvec(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec(public.halfvec, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.halfvec(public.halfvec, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.halfvec(public.halfvec, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec(public.halfvec, integer, boolean) TO service_role;


--
-- Name: FUNCTION halfvec_to_sparsevec(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_to_sparsevec(public.halfvec, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_to_sparsevec(public.halfvec, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.halfvec_to_sparsevec(public.halfvec, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_to_sparsevec(public.halfvec, integer, boolean) TO service_role;


--
-- Name: FUNCTION halfvec_to_vector(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_to_vector(public.halfvec, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_to_vector(public.halfvec, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.halfvec_to_vector(public.halfvec, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_to_vector(public.halfvec, integer, boolean) TO service_role;


--
-- Name: FUNCTION sparsevec_to_halfvec(public.sparsevec, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_to_halfvec(public.sparsevec, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_to_halfvec(public.sparsevec, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_to_halfvec(public.sparsevec, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_to_halfvec(public.sparsevec, integer, boolean) TO service_role;


--
-- Name: FUNCTION sparsevec(public.sparsevec, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec(public.sparsevec, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec(public.sparsevec, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.sparsevec(public.sparsevec, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec(public.sparsevec, integer, boolean) TO service_role;


--
-- Name: FUNCTION sparsevec_to_vector(public.sparsevec, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_to_vector(public.sparsevec, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_to_vector(public.sparsevec, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_to_vector(public.sparsevec, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_to_vector(public.sparsevec, integer, boolean) TO service_role;


--
-- Name: FUNCTION vector_to_float4(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_to_float4(public.vector, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.vector_to_float4(public.vector, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.vector_to_float4(public.vector, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.vector_to_float4(public.vector, integer, boolean) TO service_role;


--
-- Name: FUNCTION vector_to_halfvec(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_to_halfvec(public.vector, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.vector_to_halfvec(public.vector, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.vector_to_halfvec(public.vector, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.vector_to_halfvec(public.vector, integer, boolean) TO service_role;


--
-- Name: FUNCTION vector_to_sparsevec(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_to_sparsevec(public.vector, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.vector_to_sparsevec(public.vector, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.vector_to_sparsevec(public.vector, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.vector_to_sparsevec(public.vector, integer, boolean) TO service_role;


--
-- Name: FUNCTION vector(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector(public.vector, integer, boolean) TO postgres;
GRANT ALL ON FUNCTION public.vector(public.vector, integer, boolean) TO anon;
GRANT ALL ON FUNCTION public.vector(public.vector, integer, boolean) TO authenticated;
GRANT ALL ON FUNCTION public.vector(public.vector, integer, boolean) TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION job_cache_invalidate(); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.job_cache_invalidate() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(job_name text, schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(job_name text, schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_id bigint); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_id bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_name text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION algorithm_sign(signables text, secret text, algorithm text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.algorithm_sign(signables text, secret text, algorithm text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION sign(payload json, secret text, algorithm text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.sign(payload json, secret text, algorithm text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION try_cast_double(inp text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.try_cast_double(inp text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION url_decode(data text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.url_decode(data text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION url_encode(data bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.url_encode(data bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION verify(token text, secret text, algorithm text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.verify(token text, secret text, algorithm text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- Name: FUNCTION crypto_aead_det_decrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea); Type: ACL; Schema: pgsodium; Owner: pgsodium_keymaker
--

GRANT ALL ON FUNCTION pgsodium.crypto_aead_det_decrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea) TO service_role;


--
-- Name: FUNCTION crypto_aead_det_encrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea); Type: ACL; Schema: pgsodium; Owner: pgsodium_keymaker
--

GRANT ALL ON FUNCTION pgsodium.crypto_aead_det_encrypt(message bytea, additional bytea, key_uuid uuid, nonce bytea) TO service_role;


--
-- Name: FUNCTION crypto_aead_det_keygen(); Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pgsodium.crypto_aead_det_keygen() TO service_role;


--
-- Name: FUNCTION actualizar_rol_usuario(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.actualizar_rol_usuario() TO anon;
GRANT ALL ON FUNCTION public.actualizar_rol_usuario() TO authenticated;
GRANT ALL ON FUNCTION public.actualizar_rol_usuario() TO service_role;


--
-- Name: FUNCTION actualizar_rol_usuario_manual(user_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.actualizar_rol_usuario_manual(user_id integer) TO anon;
GRANT ALL ON FUNCTION public.actualizar_rol_usuario_manual(user_id integer) TO authenticated;
GRANT ALL ON FUNCTION public.actualizar_rol_usuario_manual(user_id integer) TO service_role;


--
-- Name: FUNCTION actualizar_suscripciones_vencidas(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.actualizar_suscripciones_vencidas() TO anon;
GRANT ALL ON FUNCTION public.actualizar_suscripciones_vencidas() TO authenticated;
GRANT ALL ON FUNCTION public.actualizar_suscripciones_vencidas() TO service_role;


--
-- Name: FUNCTION binary_quantize(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.binary_quantize(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.binary_quantize(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.binary_quantize(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.binary_quantize(public.halfvec) TO service_role;


--
-- Name: FUNCTION binary_quantize(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.binary_quantize(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.binary_quantize(public.vector) TO anon;
GRANT ALL ON FUNCTION public.binary_quantize(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.binary_quantize(public.vector) TO service_role;


--
-- Name: FUNCTION check_and_delete_old_chats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_and_delete_old_chats() TO anon;
GRANT ALL ON FUNCTION public.check_and_delete_old_chats() TO authenticated;
GRANT ALL ON FUNCTION public.check_and_delete_old_chats() TO service_role;


--
-- Name: FUNCTION cleanup_old_file_attachments(days_old integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_file_attachments(days_old integer) TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_file_attachments(days_old integer) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_file_attachments(days_old integer) TO service_role;


--
-- Name: FUNCTION cleanup_old_security_events(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_security_events() TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_security_events() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_security_events() TO service_role;


--
-- Name: FUNCTION cosine_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.cosine_distance(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.cosine_distance(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.cosine_distance(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.cosine_distance(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION cosine_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.cosine_distance(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.cosine_distance(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.cosine_distance(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.cosine_distance(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION cosine_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.cosine_distance(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.cosine_distance(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.cosine_distance(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.cosine_distance(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION delete_soft_deleted_chats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_soft_deleted_chats() TO anon;
GRANT ALL ON FUNCTION public.delete_soft_deleted_chats() TO authenticated;
GRANT ALL ON FUNCTION public.delete_soft_deleted_chats() TO service_role;


--
-- Name: FUNCTION evitar_duplicados_suscripciones(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.evitar_duplicados_suscripciones() TO anon;
GRANT ALL ON FUNCTION public.evitar_duplicados_suscripciones() TO authenticated;
GRANT ALL ON FUNCTION public.evitar_duplicados_suscripciones() TO service_role;


--
-- Name: FUNCTION expirar_suscripciones(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.expirar_suscripciones() TO anon;
GRANT ALL ON FUNCTION public.expirar_suscripciones() TO authenticated;
GRANT ALL ON FUNCTION public.expirar_suscripciones() TO service_role;


--
-- Name: FUNCTION get_deletion_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_deletion_stats() TO anon;
GRANT ALL ON FUNCTION public.get_deletion_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_deletion_stats() TO service_role;


--
-- Name: FUNCTION halfvec_accum(double precision[], public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_accum(double precision[], public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_accum(double precision[], public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_accum(double precision[], public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_accum(double precision[], public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_add(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_add(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_add(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_add(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_add(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_avg(double precision[]); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_avg(double precision[]) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_avg(double precision[]) TO anon;
GRANT ALL ON FUNCTION public.halfvec_avg(double precision[]) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_avg(double precision[]) TO service_role;


--
-- Name: FUNCTION halfvec_cmp(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_cmp(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_cmp(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_cmp(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_cmp(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_combine(double precision[], double precision[]); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_combine(double precision[], double precision[]) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_combine(double precision[], double precision[]) TO anon;
GRANT ALL ON FUNCTION public.halfvec_combine(double precision[], double precision[]) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_combine(double precision[], double precision[]) TO service_role;


--
-- Name: FUNCTION halfvec_concat(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_concat(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_concat(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_concat(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_concat(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_eq(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_eq(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_eq(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_eq(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_eq(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_ge(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_ge(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_ge(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_ge(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_ge(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_gt(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_gt(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_gt(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_gt(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_gt(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_l2_squared_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_l2_squared_distance(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_l2_squared_distance(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_l2_squared_distance(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_l2_squared_distance(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_le(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_le(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_le(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_le(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_le(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_lt(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_lt(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_lt(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_lt(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_lt(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_mul(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_mul(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_mul(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_mul(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_mul(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_ne(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_ne(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_ne(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_ne(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_ne(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_negative_inner_product(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_negative_inner_product(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_negative_inner_product(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_negative_inner_product(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_negative_inner_product(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_spherical_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_spherical_distance(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_spherical_distance(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_spherical_distance(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_spherical_distance(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION halfvec_sub(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.halfvec_sub(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.halfvec_sub(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.halfvec_sub(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.halfvec_sub(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION hamming_distance(bit, bit); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.hamming_distance(bit, bit) TO postgres;
GRANT ALL ON FUNCTION public.hamming_distance(bit, bit) TO anon;
GRANT ALL ON FUNCTION public.hamming_distance(bit, bit) TO authenticated;
GRANT ALL ON FUNCTION public.hamming_distance(bit, bit) TO service_role;


--
-- Name: FUNCTION hnsw_bit_support(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.hnsw_bit_support(internal) TO postgres;
GRANT ALL ON FUNCTION public.hnsw_bit_support(internal) TO anon;
GRANT ALL ON FUNCTION public.hnsw_bit_support(internal) TO authenticated;
GRANT ALL ON FUNCTION public.hnsw_bit_support(internal) TO service_role;


--
-- Name: FUNCTION hnsw_halfvec_support(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.hnsw_halfvec_support(internal) TO postgres;
GRANT ALL ON FUNCTION public.hnsw_halfvec_support(internal) TO anon;
GRANT ALL ON FUNCTION public.hnsw_halfvec_support(internal) TO authenticated;
GRANT ALL ON FUNCTION public.hnsw_halfvec_support(internal) TO service_role;


--
-- Name: FUNCTION hnsw_sparsevec_support(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.hnsw_sparsevec_support(internal) TO postgres;
GRANT ALL ON FUNCTION public.hnsw_sparsevec_support(internal) TO anon;
GRANT ALL ON FUNCTION public.hnsw_sparsevec_support(internal) TO authenticated;
GRANT ALL ON FUNCTION public.hnsw_sparsevec_support(internal) TO service_role;


--
-- Name: FUNCTION hnswhandler(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.hnswhandler(internal) TO postgres;
GRANT ALL ON FUNCTION public.hnswhandler(internal) TO anon;
GRANT ALL ON FUNCTION public.hnswhandler(internal) TO authenticated;
GRANT ALL ON FUNCTION public.hnswhandler(internal) TO service_role;


--
-- Name: FUNCTION inner_product(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.inner_product(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.inner_product(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.inner_product(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.inner_product(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION inner_product(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.inner_product(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.inner_product(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.inner_product(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.inner_product(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION inner_product(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.inner_product(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.inner_product(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.inner_product(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.inner_product(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION ivfflat_bit_support(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.ivfflat_bit_support(internal) TO postgres;
GRANT ALL ON FUNCTION public.ivfflat_bit_support(internal) TO anon;
GRANT ALL ON FUNCTION public.ivfflat_bit_support(internal) TO authenticated;
GRANT ALL ON FUNCTION public.ivfflat_bit_support(internal) TO service_role;


--
-- Name: FUNCTION ivfflat_halfvec_support(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.ivfflat_halfvec_support(internal) TO postgres;
GRANT ALL ON FUNCTION public.ivfflat_halfvec_support(internal) TO anon;
GRANT ALL ON FUNCTION public.ivfflat_halfvec_support(internal) TO authenticated;
GRANT ALL ON FUNCTION public.ivfflat_halfvec_support(internal) TO service_role;


--
-- Name: FUNCTION ivfflathandler(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.ivfflathandler(internal) TO postgres;
GRANT ALL ON FUNCTION public.ivfflathandler(internal) TO anon;
GRANT ALL ON FUNCTION public.ivfflathandler(internal) TO authenticated;
GRANT ALL ON FUNCTION public.ivfflathandler(internal) TO service_role;


--
-- Name: FUNCTION jaccard_distance(bit, bit); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.jaccard_distance(bit, bit) TO postgres;
GRANT ALL ON FUNCTION public.jaccard_distance(bit, bit) TO anon;
GRANT ALL ON FUNCTION public.jaccard_distance(bit, bit) TO authenticated;
GRANT ALL ON FUNCTION public.jaccard_distance(bit, bit) TO service_role;


--
-- Name: FUNCTION kw_match_anatomia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_anatomia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_anatomia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_anatomia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_algebra(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_algebra(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_algebra(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_algebra(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_calculo(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_calculo(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_calculo(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_calculo(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_calculoeconomico(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_calculoeconomico(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_calculoeconomico(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_calculoeconomico(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_cienciasaplicadas(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_cienciasaplicadas(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_cienciasaplicadas(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_cienciasaplicadas(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_cienciasbasicas(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_cienciasbasicas(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_cienciasbasicas(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_cienciasbasicas(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_cirugia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_cirugia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_cirugia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_cirugia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_computacion(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_computacion(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_computacion(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_computacion(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_desarrolloeconomico(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_desarrolloeconomico(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_desarrolloeconomico(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_desarrolloeconomico(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_dsm5(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_dsm5(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_dsm5(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_dsm5(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_econometria(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_econometria(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_econometria(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_econometria(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_economia_internacional(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_economia_internacional(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_economia_internacional(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_economia_internacional(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_economialaboral(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_economialaboral(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_economialaboral(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_economialaboral(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_ej_53(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_ej_53(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_ej_53(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_ej_53(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_electricidad(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_electricidad(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_electricidad(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_electricidad(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_epidemiologia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_epidemiologia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_epidemiologia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_epidemiologia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_epistemologia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_epistemologia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_epistemologia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_epistemologia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_especialidmed1(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_especialidmed1(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_especialidmed1(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_especialidmed1(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_especialidmed2(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_especialidmed2(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_especialidmed2(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_especialidmed2(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_estadistica(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_estadistica(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_estadistica(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_estadistica(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_finanzas(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_finanzas(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_finanzas(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_finanzas(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_historiaeconomica(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_historiaeconomica(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_historiaeconomica(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_historiaeconomica(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_locuraabsoluta_52(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_locuraabsoluta_52(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_locuraabsoluta_52(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_locuraabsoluta_52(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_macroeconomia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_macroeconomia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_macroeconomia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_macroeconomia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_matematicaavz(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_matematicaavz(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_matematicaavz(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_matematicaavz(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_medicinainterna(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_medicinainterna(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_medicinainterna(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_medicinainterna(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_medicinamat(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_medicinamat(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_medicinamat(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_medicinamat(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_microeconomia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_microeconomia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_microeconomia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_microeconomia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_neuropsicologia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_neuropsicologia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_neuropsicologia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_neuropsicologia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_psicdiagnostico(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_psicdiagnostico(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_psicdiagnostico(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_psicdiagnostico(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_psicoanalisis(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_psicoanalisis(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_psicoanalisis(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_psicoanalisis(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_psicoestadistica(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_psicoestadistica(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_psicoestadistica(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_psicoestadistica(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_psicologiaev(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_psicologiaev(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_psicologiaev(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_psicologiaev(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_psicologiageneral(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_psicologiageneral(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_psicologiageneral(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_psicologiageneral(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_psicologiasocial(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_psicologiasocial(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_psicologiasocial(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_psicologiasocial(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_psicopatologia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_psicopatologia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_psicopatologia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_psicopatologia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_quimica(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_quimica(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_quimica(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_quimica(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_redes(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_redes(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_redes(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_redes(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_resismateriales(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_resismateriales(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_resismateriales(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_resismateriales(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_sectorpublico(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_sectorpublico(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_sectorpublico(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_sectorpublico(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_emb_semiologia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_emb_semiologia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_emb_semiologia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_emb_semiologia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_fisica(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_fisica(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_fisica(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_fisica(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION kw_match_patologia(query_text text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.kw_match_patologia(query_text text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.kw_match_patologia(query_text text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.kw_match_patologia(query_text text, match_count integer) TO service_role;


--
-- Name: FUNCTION l1_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l1_distance(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.l1_distance(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.l1_distance(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.l1_distance(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION l1_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l1_distance(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.l1_distance(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.l1_distance(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.l1_distance(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION l1_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l1_distance(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.l1_distance(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.l1_distance(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.l1_distance(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION l2_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_distance(public.halfvec, public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.l2_distance(public.halfvec, public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.l2_distance(public.halfvec, public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.l2_distance(public.halfvec, public.halfvec) TO service_role;


--
-- Name: FUNCTION l2_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_distance(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.l2_distance(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.l2_distance(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.l2_distance(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION l2_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_distance(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.l2_distance(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.l2_distance(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.l2_distance(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION l2_norm(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_norm(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.l2_norm(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.l2_norm(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.l2_norm(public.halfvec) TO service_role;


--
-- Name: FUNCTION l2_norm(public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_norm(public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.l2_norm(public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.l2_norm(public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.l2_norm(public.sparsevec) TO service_role;


--
-- Name: FUNCTION l2_normalize(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_normalize(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.l2_normalize(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.l2_normalize(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.l2_normalize(public.halfvec) TO service_role;


--
-- Name: FUNCTION l2_normalize(public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_normalize(public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.l2_normalize(public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.l2_normalize(public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.l2_normalize(public.sparsevec) TO service_role;


--
-- Name: FUNCTION l2_normalize(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.l2_normalize(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.l2_normalize(public.vector) TO anon;
GRANT ALL ON FUNCTION public.l2_normalize(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.l2_normalize(public.vector) TO service_role;


--
-- Name: FUNCTION manual_cleanup_chats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.manual_cleanup_chats() TO anon;
GRANT ALL ON FUNCTION public.manual_cleanup_chats() TO authenticated;
GRANT ALL ON FUNCTION public.manual_cleanup_chats() TO service_role;


--
-- Name: FUNCTION match_agentetube(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_agentetube(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_agentetube(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_agentetube(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) TO service_role;


--
-- Name: FUNCTION match_anatomia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_anatomia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_anatomia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_anatomia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_chat_history(query_embedding public.vector, id_user_param integer, id_ava_param integer, id_herramienta_param integer, id_chat_param uuid, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_chat_history(query_embedding public.vector, id_user_param integer, id_ava_param integer, id_herramienta_param integer, id_chat_param uuid, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_chat_history(query_embedding public.vector, id_user_param integer, id_ava_param integer, id_herramienta_param integer, id_chat_param uuid, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_chat_history(query_embedding public.vector, id_user_param integer, id_ava_param integer, id_herramienta_param integer, id_chat_param uuid, match_count integer) TO service_role;


--
-- Name: FUNCTION match_emb_algebra(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_algebra(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_algebra(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_algebra(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_calculo(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_calculo(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_calculo(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_calculo(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_calculoeconomico(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_calculoeconomico(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_calculoeconomico(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_calculoeconomico(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_cienciasaplicadas(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_cienciasaplicadas(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_cienciasaplicadas(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_cienciasaplicadas(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_cienciasbasicas(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_cienciasbasicas(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_cienciasbasicas(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_cienciasbasicas(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_cirugia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_cirugia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_cirugia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_cirugia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_computacion(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_computacion(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_computacion(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_computacion(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_desarrolloeconomico(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_desarrolloeconomico(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_desarrolloeconomico(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_desarrolloeconomico(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_dsm5(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_dsm5(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_dsm5(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_dsm5(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_econometria(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_econometria(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_econometria(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_econometria(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_economia_internacional(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_economia_internacional(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_economia_internacional(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_economia_internacional(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_economialaboral(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_economialaboral(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_economialaboral(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_economialaboral(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_ej_53(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_ej_53(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_ej_53(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_ej_53(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_electricidad(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_electricidad(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_electricidad(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_electricidad(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_epidemiologia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_epidemiologia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_epidemiologia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_epidemiologia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_epistemologia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_epistemologia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_epistemologia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_epistemologia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_especialidmed1(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_especialidmed1(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_especialidmed1(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_especialidmed1(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_especialidmed2(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_especialidmed2(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_especialidmed2(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_especialidmed2(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_estadistica(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_estadistica(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_estadistica(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_estadistica(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_finanzas(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_finanzas(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_finanzas(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_finanzas(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_historiaeconomica(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_historiaeconomica(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_historiaeconomica(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_historiaeconomica(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_locuraabsoluta_52(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_locuraabsoluta_52(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_locuraabsoluta_52(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_locuraabsoluta_52(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_macroeconomia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_macroeconomia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_macroeconomia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_macroeconomia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_matematicaavz(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_matematicaavz(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_matematicaavz(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_matematicaavz(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_medicinainterna(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_medicinainterna(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_medicinainterna(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_medicinainterna(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_medicinamat(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_medicinamat(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_medicinamat(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_medicinamat(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_microeconomia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_microeconomia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_microeconomia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_microeconomia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_neuropsicologia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_neuropsicologia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_neuropsicologia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_neuropsicologia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_psicdiagnostico(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_psicdiagnostico(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_psicdiagnostico(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_psicdiagnostico(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_psicoanalisis(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_psicoanalisis(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_psicoanalisis(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_psicoanalisis(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_psicoestadistica(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_psicoestadistica(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_psicoestadistica(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_psicoestadistica(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_psicologiaev(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_psicologiaev(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_psicologiaev(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_psicologiaev(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_psicologiageneral(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_psicologiageneral(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_psicologiageneral(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_psicologiageneral(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_psicologiasocial(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_psicologiasocial(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_psicologiasocial(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_psicologiasocial(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_psicopatologia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_psicopatologia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_psicopatologia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_psicopatologia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_quimica(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_quimica(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_quimica(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_quimica(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_redes(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_redes(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_redes(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_redes(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_resismateriales(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_resismateriales(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_resismateriales(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_resismateriales(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_sectorpublico(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_sectorpublico(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_sectorpublico(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_sectorpublico(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_emb_semiologia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_emb_semiologia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_emb_semiologia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_emb_semiologia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_fisica(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_fisica(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_fisica(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_fisica(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_marketing_contents(query_embedding public.vector, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_marketing_contents(query_embedding public.vector, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_marketing_contents(query_embedding public.vector, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_marketing_contents(query_embedding public.vector, match_count integer) TO service_role;


--
-- Name: FUNCTION match_marketing_profiles(query_embedding public.vector, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_marketing_profiles(query_embedding public.vector, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_marketing_profiles(query_embedding public.vector, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_marketing_profiles(query_embedding public.vector, match_count integer) TO service_role;


--
-- Name: FUNCTION match_patologia(query_embedding public.vector, match_count integer, filter jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_patologia(query_embedding public.vector, match_count integer, filter jsonb) TO anon;
GRANT ALL ON FUNCTION public.match_patologia(query_embedding public.vector, match_count integer, filter jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.match_patologia(query_embedding public.vector, match_count integer, filter jsonb) TO service_role;


--
-- Name: FUNCTION match_pdfs(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.match_pdfs(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.match_pdfs(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.match_pdfs(query_embedding public.vector, id_user_param integer, id_chat_param uuid, match_count integer) TO service_role;


--
-- Name: FUNCTION obtener_estadisticas_suscripciones(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.obtener_estadisticas_suscripciones() TO anon;
GRANT ALL ON FUNCTION public.obtener_estadisticas_suscripciones() TO authenticated;
GRANT ALL ON FUNCTION public.obtener_estadisticas_suscripciones() TO service_role;


--
-- Name: FUNCTION rand_ts(start_ts timestamp with time zone, end_ts timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rand_ts(start_ts timestamp with time zone, end_ts timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.rand_ts(start_ts timestamp with time zone, end_ts timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.rand_ts(start_ts timestamp with time zone, end_ts timestamp with time zone) TO service_role;


--
-- Name: FUNCTION schedule_chat_cleanup(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.schedule_chat_cleanup() TO anon;
GRANT ALL ON FUNCTION public.schedule_chat_cleanup() TO authenticated;
GRANT ALL ON FUNCTION public.schedule_chat_cleanup() TO service_role;


--
-- Name: FUNCTION search_marketing_memory(query_embedding public.vector, memory_type text, match_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_marketing_memory(query_embedding public.vector, memory_type text, match_count integer) TO anon;
GRANT ALL ON FUNCTION public.search_marketing_memory(query_embedding public.vector, memory_type text, match_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_marketing_memory(query_embedding public.vector, memory_type text, match_count integer) TO service_role;


--
-- Name: FUNCTION sparsevec_cmp(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_cmp(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_cmp(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_cmp(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_cmp(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_eq(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_eq(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_eq(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_eq(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_eq(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_ge(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_ge(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_ge(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_ge(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_ge(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_gt(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_gt(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_gt(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_gt(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_gt(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_l2_squared_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_l2_squared_distance(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_l2_squared_distance(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_l2_squared_distance(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_l2_squared_distance(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_le(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_le(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_le(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_le(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_le(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_lt(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_lt(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_lt(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_lt(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_lt(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_ne(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_ne(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_ne(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_ne(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_ne(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION sparsevec_negative_inner_product(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sparsevec_negative_inner_product(public.sparsevec, public.sparsevec) TO postgres;
GRANT ALL ON FUNCTION public.sparsevec_negative_inner_product(public.sparsevec, public.sparsevec) TO anon;
GRANT ALL ON FUNCTION public.sparsevec_negative_inner_product(public.sparsevec, public.sparsevec) TO authenticated;
GRANT ALL ON FUNCTION public.sparsevec_negative_inner_product(public.sparsevec, public.sparsevec) TO service_role;


--
-- Name: FUNCTION subvector(public.halfvec, integer, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.subvector(public.halfvec, integer, integer) TO postgres;
GRANT ALL ON FUNCTION public.subvector(public.halfvec, integer, integer) TO anon;
GRANT ALL ON FUNCTION public.subvector(public.halfvec, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.subvector(public.halfvec, integer, integer) TO service_role;


--
-- Name: FUNCTION subvector(public.vector, integer, integer); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.subvector(public.vector, integer, integer) TO postgres;
GRANT ALL ON FUNCTION public.subvector(public.vector, integer, integer) TO anon;
GRANT ALL ON FUNCTION public.subvector(public.vector, integer, integer) TO authenticated;
GRANT ALL ON FUNCTION public.subvector(public.vector, integer, integer) TO service_role;


--
-- Name: FUNCTION update_chat_last_message_timestamp(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_chat_last_message_timestamp() TO anon;
GRANT ALL ON FUNCTION public.update_chat_last_message_timestamp() TO authenticated;
GRANT ALL ON FUNCTION public.update_chat_last_message_timestamp() TO service_role;


--
-- Name: FUNCTION update_file_attachments_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_file_attachments_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_file_attachments_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_file_attachments_updated_at() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION vector_accum(double precision[], public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_accum(double precision[], public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_accum(double precision[], public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_accum(double precision[], public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_accum(double precision[], public.vector) TO service_role;


--
-- Name: FUNCTION vector_add(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_add(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_add(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_add(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_add(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_avg(double precision[]); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_avg(double precision[]) TO postgres;
GRANT ALL ON FUNCTION public.vector_avg(double precision[]) TO anon;
GRANT ALL ON FUNCTION public.vector_avg(double precision[]) TO authenticated;
GRANT ALL ON FUNCTION public.vector_avg(double precision[]) TO service_role;


--
-- Name: FUNCTION vector_cmp(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_cmp(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_cmp(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_cmp(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_cmp(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_combine(double precision[], double precision[]); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_combine(double precision[], double precision[]) TO postgres;
GRANT ALL ON FUNCTION public.vector_combine(double precision[], double precision[]) TO anon;
GRANT ALL ON FUNCTION public.vector_combine(double precision[], double precision[]) TO authenticated;
GRANT ALL ON FUNCTION public.vector_combine(double precision[], double precision[]) TO service_role;


--
-- Name: FUNCTION vector_concat(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_concat(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_concat(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_concat(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_concat(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_dims(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_dims(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.vector_dims(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.vector_dims(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.vector_dims(public.halfvec) TO service_role;


--
-- Name: FUNCTION vector_dims(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_dims(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_dims(public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_dims(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_dims(public.vector) TO service_role;


--
-- Name: FUNCTION vector_eq(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_eq(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_eq(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_eq(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_eq(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_ge(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_ge(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_ge(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_ge(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_ge(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_gt(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_gt(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_gt(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_gt(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_gt(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_l2_squared_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_l2_squared_distance(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_l2_squared_distance(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_l2_squared_distance(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_l2_squared_distance(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_le(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_le(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_le(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_le(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_le(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_lt(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_lt(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_lt(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_lt(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_lt(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_mul(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_mul(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_mul(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_mul(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_mul(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_ne(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_ne(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_ne(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_ne(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_ne(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_negative_inner_product(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_negative_inner_product(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_negative_inner_product(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_negative_inner_product(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_negative_inner_product(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_norm(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_norm(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_norm(public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_norm(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_norm(public.vector) TO service_role;


--
-- Name: FUNCTION vector_spherical_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_spherical_distance(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_spherical_distance(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_spherical_distance(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_spherical_distance(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION vector_sub(public.vector, public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.vector_sub(public.vector, public.vector) TO postgres;
GRANT ALL ON FUNCTION public.vector_sub(public.vector, public.vector) TO anon;
GRANT ALL ON FUNCTION public.vector_sub(public.vector, public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.vector_sub(public.vector, public.vector) TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION avg(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.avg(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.avg(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.avg(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.avg(public.halfvec) TO service_role;


--
-- Name: FUNCTION avg(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.avg(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.avg(public.vector) TO anon;
GRANT ALL ON FUNCTION public.avg(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.avg(public.vector) TO service_role;


--
-- Name: FUNCTION sum(public.halfvec); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sum(public.halfvec) TO postgres;
GRANT ALL ON FUNCTION public.sum(public.halfvec) TO anon;
GRANT ALL ON FUNCTION public.sum(public.halfvec) TO authenticated;
GRANT ALL ON FUNCTION public.sum(public.halfvec) TO service_role;


--
-- Name: FUNCTION sum(public.vector); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sum(public.vector) TO postgres;
GRANT ALL ON FUNCTION public.sum(public.vector) TO anon;
GRANT ALL ON FUNCTION public.sum(public.vector) TO authenticated;
GRANT ALL ON FUNCTION public.sum(public.vector) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT SELECT ON TABLE cron.job TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job_run_details; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON TABLE cron.job_run_details TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE decrypted_key; Type: ACL; Schema: pgsodium; Owner: postgres
--

GRANT ALL ON TABLE pgsodium.decrypted_key TO pgsodium_keyholder;


--
-- Name: TABLE masking_rule; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

GRANT ALL ON TABLE pgsodium.masking_rule TO pgsodium_keyholder;


--
-- Name: TABLE mask_columns; Type: ACL; Schema: pgsodium; Owner: supabase_admin
--

GRANT ALL ON TABLE pgsodium.mask_columns TO pgsodium_keyholder;


--
-- Name: TABLE account_deletion_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_deletion_requests TO anon;
GRANT ALL ON TABLE public.account_deletion_requests TO authenticated;
GRANT ALL ON TABLE public.account_deletion_requests TO service_role;


--
-- Name: SEQUENCE account_deletion_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.account_deletion_requests_id_seq TO anon;
GRANT ALL ON SEQUENCE public.account_deletion_requests_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.account_deletion_requests_id_seq TO service_role;


--
-- Name: TABLE activity_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.activity_log TO anon;
GRANT ALL ON TABLE public.activity_log TO authenticated;
GRANT ALL ON TABLE public.activity_log TO service_role;


--
-- Name: SEQUENCE activity_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.activity_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.activity_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.activity_log_id_seq TO service_role;


--
-- Name: TABLE agentetube; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.agentetube TO anon;
GRANT ALL ON TABLE public.agentetube TO authenticated;
GRANT ALL ON TABLE public.agentetube TO service_role;


--
-- Name: SEQUENCE agentetube_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.agentetube_id_seq TO anon;
GRANT ALL ON SEQUENCE public.agentetube_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.agentetube_id_seq TO service_role;


--
-- Name: TABLE analisis_impuestos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.analisis_impuestos TO anon;
GRANT ALL ON TABLE public.analisis_impuestos TO authenticated;
GRANT ALL ON TABLE public.analisis_impuestos TO service_role;


--
-- Name: SEQUENCE analisis_impuestos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.analisis_impuestos_id_seq TO anon;
GRANT ALL ON SEQUENCE public.analisis_impuestos_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.analisis_impuestos_id_seq TO service_role;


--
-- Name: TABLE anatomia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.anatomia TO anon;
GRANT ALL ON TABLE public.anatomia TO authenticated;
GRANT ALL ON TABLE public.anatomia TO service_role;


--
-- Name: SEQUENCE anatomia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.anatomia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.anatomia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.anatomia_id_seq TO service_role;


--
-- Name: TABLE ava; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ava TO anon;
GRANT ALL ON TABLE public.ava TO authenticated;
GRANT ALL ON TABLE public.ava TO service_role;


--
-- Name: SEQUENCE ava_id_ava_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ava_id_ava_seq TO anon;
GRANT ALL ON SEQUENCE public.ava_id_ava_seq TO authenticated;
GRANT ALL ON SEQUENCE public.ava_id_ava_seq TO service_role;


--
-- Name: TABLE carrera; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.carrera TO anon;
GRANT ALL ON TABLE public.carrera TO authenticated;
GRANT ALL ON TABLE public.carrera TO service_role;


--
-- Name: SEQUENCE carrera_id_carrera_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.carrera_id_carrera_seq TO anon;
GRANT ALL ON SEQUENCE public.carrera_id_carrera_seq TO authenticated;
GRANT ALL ON SEQUENCE public.carrera_id_carrera_seq TO service_role;


--
-- Name: TABLE categorias_egresos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categorias_egresos TO anon;
GRANT ALL ON TABLE public.categorias_egresos TO authenticated;
GRANT ALL ON TABLE public.categorias_egresos TO service_role;


--
-- Name: SEQUENCE categorias_egresos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categorias_egresos_id_seq TO anon;
GRANT ALL ON SEQUENCE public.categorias_egresos_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.categorias_egresos_id_seq TO service_role;


--
-- Name: TABLE chat; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat TO anon;
GRANT ALL ON TABLE public.chat TO authenticated;
GRANT ALL ON TABLE public.chat TO service_role;


--
-- Name: TABLE chat_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_history TO anon;
GRANT ALL ON TABLE public.chat_history TO authenticated;
GRANT ALL ON TABLE public.chat_history TO service_role;


--
-- Name: SEQUENCE chat_history_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.chat_history_id_seq TO anon;
GRANT ALL ON SEQUENCE public.chat_history_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.chat_history_id_seq TO service_role;


--
-- Name: TABLE config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.config TO anon;
GRANT ALL ON TABLE public.config TO authenticated;
GRANT ALL ON TABLE public.config TO service_role;


--
-- Name: TABLE cookie_consent; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cookie_consent TO anon;
GRANT ALL ON TABLE public.cookie_consent TO authenticated;
GRANT ALL ON TABLE public.cookie_consent TO service_role;


--
-- Name: SEQUENCE cookie_consent_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.cookie_consent_id_seq TO anon;
GRANT ALL ON SEQUENCE public.cookie_consent_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.cookie_consent_id_seq TO service_role;


--
-- Name: TABLE deleted_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.deleted_accounts TO anon;
GRANT ALL ON TABLE public.deleted_accounts TO authenticated;
GRANT ALL ON TABLE public.deleted_accounts TO service_role;


--
-- Name: SEQUENCE deleted_accounts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.deleted_accounts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.deleted_accounts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.deleted_accounts_id_seq TO service_role;


--
-- Name: TABLE deletion_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.deletion_log TO anon;
GRANT ALL ON TABLE public.deletion_log TO authenticated;
GRANT ALL ON TABLE public.deletion_log TO service_role;


--
-- Name: SEQUENCE deletion_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.deletion_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.deletion_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.deletion_log_id_seq TO service_role;


--
-- Name: TABLE egresos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.egresos TO anon;
GRANT ALL ON TABLE public.egresos TO authenticated;
GRANT ALL ON TABLE public.egresos TO service_role;


--
-- Name: SEQUENCE egresos_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.egresos_id_seq TO anon;
GRANT ALL ON SEQUENCE public.egresos_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.egresos_id_seq TO service_role;


--
-- Name: TABLE emb_algebra; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_algebra TO anon;
GRANT ALL ON TABLE public.emb_algebra TO authenticated;
GRANT ALL ON TABLE public.emb_algebra TO service_role;


--
-- Name: SEQUENCE emb_algebra_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_algebra_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_algebra_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_algebra_id_seq TO service_role;


--
-- Name: TABLE emb_calculo; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_calculo TO anon;
GRANT ALL ON TABLE public.emb_calculo TO authenticated;
GRANT ALL ON TABLE public.emb_calculo TO service_role;


--
-- Name: SEQUENCE emb_calculo_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_calculo_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_calculo_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_calculo_id_seq TO service_role;


--
-- Name: TABLE emb_calculoeconomico; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_calculoeconomico TO anon;
GRANT ALL ON TABLE public.emb_calculoeconomico TO authenticated;
GRANT ALL ON TABLE public.emb_calculoeconomico TO service_role;


--
-- Name: SEQUENCE emb_calculoeconomico_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_calculoeconomico_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_calculoeconomico_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_calculoeconomico_id_seq TO service_role;


--
-- Name: TABLE emb_cienciasaplicadas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_cienciasaplicadas TO anon;
GRANT ALL ON TABLE public.emb_cienciasaplicadas TO authenticated;
GRANT ALL ON TABLE public.emb_cienciasaplicadas TO service_role;


--
-- Name: SEQUENCE emb_cienciasaplicadas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_cienciasaplicadas_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_cienciasaplicadas_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_cienciasaplicadas_id_seq TO service_role;


--
-- Name: TABLE emb_cienciasbasicas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_cienciasbasicas TO anon;
GRANT ALL ON TABLE public.emb_cienciasbasicas TO authenticated;
GRANT ALL ON TABLE public.emb_cienciasbasicas TO service_role;


--
-- Name: SEQUENCE emb_cienciasbasicas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_cienciasbasicas_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_cienciasbasicas_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_cienciasbasicas_id_seq TO service_role;


--
-- Name: TABLE emb_cirugia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_cirugia TO anon;
GRANT ALL ON TABLE public.emb_cirugia TO authenticated;
GRANT ALL ON TABLE public.emb_cirugia TO service_role;


--
-- Name: SEQUENCE emb_cirugia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_cirugia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_cirugia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_cirugia_id_seq TO service_role;


--
-- Name: TABLE emb_computacion; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_computacion TO anon;
GRANT ALL ON TABLE public.emb_computacion TO authenticated;
GRANT ALL ON TABLE public.emb_computacion TO service_role;


--
-- Name: SEQUENCE emb_computacion_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_computacion_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_computacion_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_computacion_id_seq TO service_role;


--
-- Name: TABLE emb_desarrolloeconomico; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_desarrolloeconomico TO anon;
GRANT ALL ON TABLE public.emb_desarrolloeconomico TO authenticated;
GRANT ALL ON TABLE public.emb_desarrolloeconomico TO service_role;


--
-- Name: SEQUENCE emb_desarrolloeconomico_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_desarrolloeconomico_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_desarrolloeconomico_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_desarrolloeconomico_id_seq TO service_role;


--
-- Name: TABLE emb_dsm5; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_dsm5 TO anon;
GRANT ALL ON TABLE public.emb_dsm5 TO authenticated;
GRANT ALL ON TABLE public.emb_dsm5 TO service_role;


--
-- Name: SEQUENCE emb_dsm5_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_dsm5_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_dsm5_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_dsm5_id_seq TO service_role;


--
-- Name: TABLE emb_econometria; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_econometria TO anon;
GRANT ALL ON TABLE public.emb_econometria TO authenticated;
GRANT ALL ON TABLE public.emb_econometria TO service_role;


--
-- Name: SEQUENCE emb_econometria_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_econometria_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_econometria_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_econometria_id_seq TO service_role;


--
-- Name: TABLE emb_economia_internacional; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_economia_internacional TO anon;
GRANT ALL ON TABLE public.emb_economia_internacional TO authenticated;
GRANT ALL ON TABLE public.emb_economia_internacional TO service_role;


--
-- Name: SEQUENCE emb_economia_internacional_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_economia_internacional_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_economia_internacional_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_economia_internacional_id_seq TO service_role;


--
-- Name: TABLE emb_economialaboral; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_economialaboral TO anon;
GRANT ALL ON TABLE public.emb_economialaboral TO authenticated;
GRANT ALL ON TABLE public.emb_economialaboral TO service_role;


--
-- Name: SEQUENCE emb_economialaboral_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_economialaboral_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_economialaboral_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_economialaboral_id_seq TO service_role;


--
-- Name: TABLE emb_electricidad; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_electricidad TO anon;
GRANT ALL ON TABLE public.emb_electricidad TO authenticated;
GRANT ALL ON TABLE public.emb_electricidad TO service_role;


--
-- Name: SEQUENCE emb_electricidad_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_electricidad_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_electricidad_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_electricidad_id_seq TO service_role;


--
-- Name: TABLE emb_epidemiologia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_epidemiologia TO anon;
GRANT ALL ON TABLE public.emb_epidemiologia TO authenticated;
GRANT ALL ON TABLE public.emb_epidemiologia TO service_role;


--
-- Name: SEQUENCE emb_epidemiologia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_epidemiologia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_epidemiologia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_epidemiologia_id_seq TO service_role;


--
-- Name: TABLE emb_epistemologia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_epistemologia TO anon;
GRANT ALL ON TABLE public.emb_epistemologia TO authenticated;
GRANT ALL ON TABLE public.emb_epistemologia TO service_role;


--
-- Name: SEQUENCE emb_epistemologia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_epistemologia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_epistemologia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_epistemologia_id_seq TO service_role;


--
-- Name: TABLE emb_especialidmed1; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_especialidmed1 TO anon;
GRANT ALL ON TABLE public.emb_especialidmed1 TO authenticated;
GRANT ALL ON TABLE public.emb_especialidmed1 TO service_role;


--
-- Name: SEQUENCE emb_especialidmed1_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_especialidmed1_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_especialidmed1_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_especialidmed1_id_seq TO service_role;


--
-- Name: TABLE emb_especialidmed2; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_especialidmed2 TO anon;
GRANT ALL ON TABLE public.emb_especialidmed2 TO authenticated;
GRANT ALL ON TABLE public.emb_especialidmed2 TO service_role;


--
-- Name: SEQUENCE emb_especialidmed2_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_especialidmed2_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_especialidmed2_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_especialidmed2_id_seq TO service_role;


--
-- Name: TABLE emb_estadistica; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_estadistica TO anon;
GRANT ALL ON TABLE public.emb_estadistica TO authenticated;
GRANT ALL ON TABLE public.emb_estadistica TO service_role;


--
-- Name: SEQUENCE emb_estadistica_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_estadistica_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_estadistica_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_estadistica_id_seq TO service_role;


--
-- Name: TABLE emb_finanzas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_finanzas TO anon;
GRANT ALL ON TABLE public.emb_finanzas TO authenticated;
GRANT ALL ON TABLE public.emb_finanzas TO service_role;


--
-- Name: SEQUENCE emb_finanzas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_finanzas_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_finanzas_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_finanzas_id_seq TO service_role;


--
-- Name: TABLE emb_fisica; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_fisica TO anon;
GRANT ALL ON TABLE public.emb_fisica TO authenticated;
GRANT ALL ON TABLE public.emb_fisica TO service_role;


--
-- Name: TABLE emb_historiaeconomica; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_historiaeconomica TO anon;
GRANT ALL ON TABLE public.emb_historiaeconomica TO authenticated;
GRANT ALL ON TABLE public.emb_historiaeconomica TO service_role;


--
-- Name: SEQUENCE emb_historiaeconomica_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_historiaeconomica_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_historiaeconomica_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_historiaeconomica_id_seq TO service_role;


--
-- Name: TABLE emb_macroeconomia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_macroeconomia TO anon;
GRANT ALL ON TABLE public.emb_macroeconomia TO authenticated;
GRANT ALL ON TABLE public.emb_macroeconomia TO service_role;


--
-- Name: SEQUENCE emb_macroeconomia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_macroeconomia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_macroeconomia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_macroeconomia_id_seq TO service_role;


--
-- Name: TABLE emb_matematicaavz; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_matematicaavz TO anon;
GRANT ALL ON TABLE public.emb_matematicaavz TO authenticated;
GRANT ALL ON TABLE public.emb_matematicaavz TO service_role;


--
-- Name: SEQUENCE emb_matematicaavz_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_matematicaavz_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_matematicaavz_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_matematicaavz_id_seq TO service_role;


--
-- Name: TABLE emb_medicinainterna; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_medicinainterna TO anon;
GRANT ALL ON TABLE public.emb_medicinainterna TO authenticated;
GRANT ALL ON TABLE public.emb_medicinainterna TO service_role;


--
-- Name: SEQUENCE emb_medicinainterna_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_medicinainterna_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_medicinainterna_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_medicinainterna_id_seq TO service_role;


--
-- Name: TABLE emb_medicinamat; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_medicinamat TO anon;
GRANT ALL ON TABLE public.emb_medicinamat TO authenticated;
GRANT ALL ON TABLE public.emb_medicinamat TO service_role;


--
-- Name: SEQUENCE emb_medicinamat_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_medicinamat_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_medicinamat_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_medicinamat_id_seq TO service_role;


--
-- Name: TABLE emb_microeconomia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_microeconomia TO anon;
GRANT ALL ON TABLE public.emb_microeconomia TO authenticated;
GRANT ALL ON TABLE public.emb_microeconomia TO service_role;


--
-- Name: SEQUENCE emb_microeconomia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_microeconomia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_microeconomia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_microeconomia_id_seq TO service_role;


--
-- Name: TABLE emb_neuropsicologia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_neuropsicologia TO anon;
GRANT ALL ON TABLE public.emb_neuropsicologia TO authenticated;
GRANT ALL ON TABLE public.emb_neuropsicologia TO service_role;


--
-- Name: SEQUENCE emb_neuropsicologia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_neuropsicologia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_neuropsicologia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_neuropsicologia_id_seq TO service_role;


--
-- Name: TABLE emb_patologia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_patologia TO anon;
GRANT ALL ON TABLE public.emb_patologia TO authenticated;
GRANT ALL ON TABLE public.emb_patologia TO service_role;


--
-- Name: TABLE emb_psicdiagnostico; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_psicdiagnostico TO anon;
GRANT ALL ON TABLE public.emb_psicdiagnostico TO authenticated;
GRANT ALL ON TABLE public.emb_psicdiagnostico TO service_role;


--
-- Name: SEQUENCE emb_psicdiagnostico_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_psicdiagnostico_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_psicdiagnostico_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_psicdiagnostico_id_seq TO service_role;


--
-- Name: TABLE emb_psicoanalisis; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_psicoanalisis TO anon;
GRANT ALL ON TABLE public.emb_psicoanalisis TO authenticated;
GRANT ALL ON TABLE public.emb_psicoanalisis TO service_role;


--
-- Name: SEQUENCE emb_psicoanalisis_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_psicoanalisis_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_psicoanalisis_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_psicoanalisis_id_seq TO service_role;


--
-- Name: TABLE emb_psicoestadistica; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_psicoestadistica TO anon;
GRANT ALL ON TABLE public.emb_psicoestadistica TO authenticated;
GRANT ALL ON TABLE public.emb_psicoestadistica TO service_role;


--
-- Name: SEQUENCE emb_psicoestadistica_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_psicoestadistica_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_psicoestadistica_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_psicoestadistica_id_seq TO service_role;


--
-- Name: TABLE emb_psicologiaev; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_psicologiaev TO anon;
GRANT ALL ON TABLE public.emb_psicologiaev TO authenticated;
GRANT ALL ON TABLE public.emb_psicologiaev TO service_role;


--
-- Name: SEQUENCE emb_psicologiaev_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_psicologiaev_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_psicologiaev_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_psicologiaev_id_seq TO service_role;


--
-- Name: TABLE emb_psicologiageneral; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_psicologiageneral TO anon;
GRANT ALL ON TABLE public.emb_psicologiageneral TO authenticated;
GRANT ALL ON TABLE public.emb_psicologiageneral TO service_role;


--
-- Name: SEQUENCE emb_psicologiageneral_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_psicologiageneral_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_psicologiageneral_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_psicologiageneral_id_seq TO service_role;


--
-- Name: TABLE emb_psicologiasocial; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_psicologiasocial TO anon;
GRANT ALL ON TABLE public.emb_psicologiasocial TO authenticated;
GRANT ALL ON TABLE public.emb_psicologiasocial TO service_role;


--
-- Name: SEQUENCE emb_psicologiasocial_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_psicologiasocial_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_psicologiasocial_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_psicologiasocial_id_seq TO service_role;


--
-- Name: TABLE emb_psicopatologia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_psicopatologia TO anon;
GRANT ALL ON TABLE public.emb_psicopatologia TO authenticated;
GRANT ALL ON TABLE public.emb_psicopatologia TO service_role;


--
-- Name: SEQUENCE emb_psicopatologia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_psicopatologia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_psicopatologia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_psicopatologia_id_seq TO service_role;


--
-- Name: TABLE emb_quimica; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_quimica TO anon;
GRANT ALL ON TABLE public.emb_quimica TO authenticated;
GRANT ALL ON TABLE public.emb_quimica TO service_role;


--
-- Name: SEQUENCE emb_quimica_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_quimica_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_quimica_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_quimica_id_seq TO service_role;


--
-- Name: TABLE emb_redes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_redes TO anon;
GRANT ALL ON TABLE public.emb_redes TO authenticated;
GRANT ALL ON TABLE public.emb_redes TO service_role;


--
-- Name: SEQUENCE emb_redes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_redes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_redes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_redes_id_seq TO service_role;


--
-- Name: TABLE emb_resismateriales; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_resismateriales TO anon;
GRANT ALL ON TABLE public.emb_resismateriales TO authenticated;
GRANT ALL ON TABLE public.emb_resismateriales TO service_role;


--
-- Name: SEQUENCE emb_resismateriales_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_resismateriales_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_resismateriales_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_resismateriales_id_seq TO service_role;


--
-- Name: TABLE emb_sectorpublico; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_sectorpublico TO anon;
GRANT ALL ON TABLE public.emb_sectorpublico TO authenticated;
GRANT ALL ON TABLE public.emb_sectorpublico TO service_role;


--
-- Name: SEQUENCE emb_sectorpublico_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_sectorpublico_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_sectorpublico_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_sectorpublico_id_seq TO service_role;


--
-- Name: TABLE emb_semiologia; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.emb_semiologia TO anon;
GRANT ALL ON TABLE public.emb_semiologia TO authenticated;
GRANT ALL ON TABLE public.emb_semiologia TO service_role;


--
-- Name: SEQUENCE emb_semiologia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.emb_semiologia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.emb_semiologia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.emb_semiologia_id_seq TO service_role;


--
-- Name: TABLE feedback; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feedback TO anon;
GRANT ALL ON TABLE public.feedback TO authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;


--
-- Name: SEQUENCE feedback_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.feedback_id_seq TO anon;
GRANT ALL ON SEQUENCE public.feedback_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.feedback_id_seq TO service_role;


--
-- Name: TABLE file_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.file_attachments TO anon;
GRANT ALL ON TABLE public.file_attachments TO authenticated;
GRANT ALL ON TABLE public.file_attachments TO service_role;


--
-- Name: SEQUENCE file_attachments_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.file_attachments_id_seq TO anon;
GRANT ALL ON SEQUENCE public.file_attachments_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.file_attachments_id_seq TO service_role;


--
-- Name: SEQUENCE fisica_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.fisica_id_seq TO anon;
GRANT ALL ON SEQUENCE public.fisica_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.fisica_id_seq TO service_role;


--
-- Name: TABLE herramienta; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.herramienta TO anon;
GRANT ALL ON TABLE public.herramienta TO authenticated;
GRANT ALL ON TABLE public.herramienta TO service_role;


--
-- Name: TABLE historial_transacciones; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.historial_transacciones TO anon;
GRANT ALL ON TABLE public.historial_transacciones TO authenticated;
GRANT ALL ON TABLE public.historial_transacciones TO service_role;


--
-- Name: SEQUENCE historial_transacciones_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.historial_transacciones_id_seq TO anon;
GRANT ALL ON SEQUENCE public.historial_transacciones_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.historial_transacciones_id_seq TO service_role;


--
-- Name: TABLE informes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.informes TO anon;
GRANT ALL ON TABLE public.informes TO authenticated;
GRANT ALL ON TABLE public.informes TO service_role;


--
-- Name: SEQUENCE informes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.informes_id_seq TO anon;
GRANT ALL ON SEQUENCE public.informes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.informes_id_seq TO service_role;


--
-- Name: TABLE login_attempts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.login_attempts TO anon;
GRANT ALL ON TABLE public.login_attempts TO authenticated;
GRANT ALL ON TABLE public.login_attempts TO service_role;


--
-- Name: TABLE marketing_contents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.marketing_contents TO anon;
GRANT ALL ON TABLE public.marketing_contents TO authenticated;
GRANT ALL ON TABLE public.marketing_contents TO service_role;


--
-- Name: TABLE marketing_interactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.marketing_interactions TO anon;
GRANT ALL ON TABLE public.marketing_interactions TO authenticated;
GRANT ALL ON TABLE public.marketing_interactions TO service_role;


--
-- Name: TABLE marketing_memory; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.marketing_memory TO anon;
GRANT ALL ON TABLE public.marketing_memory TO authenticated;
GRANT ALL ON TABLE public.marketing_memory TO service_role;


--
-- Name: TABLE marketing_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.marketing_profiles TO anon;
GRANT ALL ON TABLE public.marketing_profiles TO authenticated;
GRANT ALL ON TABLE public.marketing_profiles TO service_role;


--
-- Name: TABLE marketing_trends; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.marketing_trends TO anon;
GRANT ALL ON TABLE public.marketing_trends TO authenticated;
GRANT ALL ON TABLE public.marketing_trends TO service_role;


--
-- Name: TABLE pais; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pais TO anon;
GRANT ALL ON TABLE public.pais TO authenticated;
GRANT ALL ON TABLE public.pais TO service_role;


--
-- Name: SEQUENCE pais_id_pais_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pais_id_pais_seq TO anon;
GRANT ALL ON SEQUENCE public.pais_id_pais_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pais_id_pais_seq TO service_role;


--
-- Name: TABLE password_reset_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.password_reset_tokens TO anon;
GRANT ALL ON TABLE public.password_reset_tokens TO authenticated;
GRANT ALL ON TABLE public.password_reset_tokens TO service_role;


--
-- Name: SEQUENCE patologia_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.patologia_id_seq TO anon;
GRANT ALL ON SEQUENCE public.patologia_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.patologia_id_seq TO service_role;


--
-- Name: TABLE payments_arg; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments_arg TO anon;
GRANT ALL ON TABLE public.payments_arg TO authenticated;
GRANT ALL ON TABLE public.payments_arg TO service_role;


--
-- Name: SEQUENCE payments_arg_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.payments_arg_id_seq TO anon;
GRANT ALL ON SEQUENCE public.payments_arg_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.payments_arg_id_seq TO service_role;


--
-- Name: TABLE pdfs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pdfs TO anon;
GRANT ALL ON TABLE public.pdfs TO authenticated;
GRANT ALL ON TABLE public.pdfs TO service_role;


--
-- Name: SEQUENCE pdfs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.pdfs_id_seq TO anon;
GRANT ALL ON SEQUENCE public.pdfs_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pdfs_id_seq TO service_role;


--
-- Name: TABLE perfil; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.perfil TO anon;
GRANT ALL ON TABLE public.perfil TO authenticated;
GRANT ALL ON TABLE public.perfil TO service_role;


--
-- Name: TABLE rol; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rol TO anon;
GRANT ALL ON TABLE public.rol TO authenticated;
GRANT ALL ON TABLE public.rol TO service_role;


--
-- Name: SEQUENCE rol_id_rol_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rol_id_rol_seq TO anon;
GRANT ALL ON SEQUENCE public.rol_id_rol_seq TO authenticated;
GRANT ALL ON SEQUENCE public.rol_id_rol_seq TO service_role;


--
-- Name: TABLE scheduled_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.scheduled_tasks TO anon;
GRANT ALL ON TABLE public.scheduled_tasks TO authenticated;
GRANT ALL ON TABLE public.scheduled_tasks TO service_role;


--
-- Name: SEQUENCE scheduled_tasks_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.scheduled_tasks_id_seq TO anon;
GRANT ALL ON SEQUENCE public.scheduled_tasks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.scheduled_tasks_id_seq TO service_role;


--
-- Name: TABLE security_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.security_events TO anon;
GRANT ALL ON TABLE public.security_events TO authenticated;
GRANT ALL ON TABLE public.security_events TO service_role;


--
-- Name: SEQUENCE security_events_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.security_events_id_seq TO anon;
GRANT ALL ON SEQUENCE public.security_events_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.security_events_id_seq TO service_role;


--
-- Name: TABLE subscriptions_arg; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions_arg TO anon;
GRANT ALL ON TABLE public.subscriptions_arg TO authenticated;
GRANT ALL ON TABLE public.subscriptions_arg TO service_role;


--
-- Name: SEQUENCE subscriptions_arg_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.subscriptions_arg_id_seq TO anon;
GRANT ALL ON SEQUENCE public.subscriptions_arg_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.subscriptions_arg_id_seq TO service_role;


--
-- Name: TABLE suscripciones; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.suscripciones TO anon;
GRANT ALL ON TABLE public.suscripciones TO authenticated;
GRANT ALL ON TABLE public.suscripciones TO service_role;


--
-- Name: SEQUENCE suscripciones_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.suscripciones_id_seq TO anon;
GRANT ALL ON SEQUENCE public.suscripciones_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.suscripciones_id_seq TO service_role;


--
-- Name: TABLE system_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_config TO anon;
GRANT ALL ON TABLE public.system_config TO authenticated;
GRANT ALL ON TABLE public.system_config TO service_role;


--
-- Name: TABLE terms_acceptance_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.terms_acceptance_tokens TO anon;
GRANT ALL ON TABLE public.terms_acceptance_tokens TO authenticated;
GRANT ALL ON TABLE public.terms_acceptance_tokens TO service_role;


--
-- Name: SEQUENCE terms_acceptance_tokens_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.terms_acceptance_tokens_id_seq TO anon;
GRANT ALL ON SEQUENCE public.terms_acceptance_tokens_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.terms_acceptance_tokens_id_seq TO service_role;


--
-- Name: TABLE terms_acceptances; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.terms_acceptances TO anon;
GRANT ALL ON TABLE public.terms_acceptances TO authenticated;
GRANT ALL ON TABLE public.terms_acceptances TO service_role;


--
-- Name: SEQUENCE terms_acceptances_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.terms_acceptances_id_seq TO anon;
GRANT ALL ON SEQUENCE public.terms_acceptances_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.terms_acceptances_id_seq TO service_role;


--
-- Name: TABLE universidad; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.universidad TO anon;
GRANT ALL ON TABLE public.universidad TO authenticated;
GRANT ALL ON TABLE public.universidad TO service_role;


--
-- Name: SEQUENCE universidad_id_universidad_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.universidad_id_universidad_seq TO anon;
GRANT ALL ON SEQUENCE public.universidad_id_universidad_seq TO authenticated;
GRANT ALL ON SEQUENCE public.universidad_id_universidad_seq TO service_role;


--
-- Name: TABLE usuario; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usuario TO anon;
GRANT ALL ON TABLE public.usuario TO authenticated;
GRANT ALL ON TABLE public.usuario TO service_role;


--
-- Name: SEQUENCE usuario_id_user_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.usuario_id_user_seq TO anon;
GRANT ALL ON SEQUENCE public.usuario_id_user_seq TO authenticated;
GRANT ALL ON SEQUENCE public.usuario_id_user_seq TO service_role;


--
-- Name: TABLE webhook_events_arg; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.webhook_events_arg TO anon;
GRANT ALL ON TABLE public.webhook_events_arg TO authenticated;
GRANT ALL ON TABLE public.webhook_events_arg TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO postgres;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO postgres;


--
-- Name: TABLE prefixes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.prefixes TO service_role;
GRANT ALL ON TABLE storage.prefixes TO authenticated;
GRANT ALL ON TABLE storage.prefixes TO anon;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: pgsodium; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium GRANT ALL ON SEQUENCES TO pgsodium_keyholder;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: pgsodium; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium GRANT ALL ON TABLES TO pgsodium_keyholder;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: pgsodium_masks; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium_masks GRANT ALL ON SEQUENCES TO pgsodium_keyiduser;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: pgsodium_masks; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium_masks GRANT ALL ON FUNCTIONS TO pgsodium_keyiduser;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: pgsodium_masks; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA pgsodium_masks GRANT ALL ON TABLES TO pgsodium_keyiduser;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict xLl5tqyrHBVn5J7cTWfrkXQzV1oLWrckt32corfrtA3PeOIBXin0GyPBgG7S5db

