--
-- PostgreSQL database dump
--

-- Dumped from database version 12.1
-- Dumped by pg_dump version 12.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: contact_update; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_update (
    id integer NOT NULL,
    contact_id integer,
    date_of_status timestamp with time zone,
    notes character varying,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer
);


ALTER TABLE public.contact_update OWNER TO postgres;

--
-- Name: contact_update_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contact_update_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contact_update_id_seq OWNER TO postgres;

--
-- Name: contact_update_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contact_update_id_seq OWNED BY public.contact_update.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    suggestion_id integer NOT NULL,
    name character varying,
    ministry integer,
    notes character varying,
    attachment json,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer,
    modified_by integer,
    modified_on timestamp with time zone
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contacts_id_seq OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: facts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.facts (
    id integer NOT NULL,
    suggestion_id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    fact_type smallint,
    uom smallint,
    value integer,
    attachment json,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer,
    modified_by integer,
    modified_on timestamp with time zone
);


ALTER TABLE public.facts OWNER TO postgres;

--
-- Name: facts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.facts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.facts_id_seq OWNER TO postgres;

--
-- Name: facts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.facts_id_seq OWNED BY public.facts.id;


--
-- Name: lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lists (
    id integer NOT NULL,
    list_name character varying NOT NULL,
    description character varying,
    list_group character varying,
    is_deleted boolean DEFAULT false,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer,
    modified_by integer,
    modified_on timestamp with time zone
);


ALTER TABLE public.lists OWNER TO postgres;

--
-- Name: lists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lists_id_seq OWNER TO postgres;

--
-- Name: lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lists_id_seq OWNED BY public.lists.id;


--
-- Name: login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_history (
    id integer NOT NULL,
    login_name character varying,
    ip_address character varying,
    attempted_on timestamp with time zone DEFAULT now(),
    status boolean,
    remarks character varying,
    session_id character varying
);


ALTER TABLE public.login_history OWNER TO postgres;

--
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.login_history_id_seq OWNER TO postgres;

--
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- Name: login_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_user (
    id integer NOT NULL,
    login_name character varying NOT NULL,
    user_name character varying NOT NULL,
    mobile character varying,
    email character varying,
    password_encrypted character varying,
    is_deleted boolean DEFAULT false,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer
);


ALTER TABLE public.login_user OWNER TO postgres;

--
-- Name: login_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.login_user_id_seq OWNER TO postgres;

--
-- Name: login_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_user_id_seq OWNED BY public.login_user.id;


--
-- Name: map; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.map (
    id integer NOT NULL,
    suggestion_id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    map_type smallint,
    uom smallint,
    value integer,
    attachment json,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer,
    modified_by integer,
    modified_on timestamp with time zone
);


ALTER TABLE public.map OWNER TO postgres;

--
-- Name: map_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.map_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.map_id_seq OWNER TO postgres;

--
-- Name: map_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.map_id_seq OWNED BY public.map.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    project_code character varying,
    project_name character varying,
    description character varying,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    department_id integer,
    project_type_id integer,
    active_flag boolean DEFAULT true,
    delete_flag boolean DEFAULT false,
    created_by integer,
    created_on timestamp with time zone DEFAULT now(),
    last_modified_by integer,
    last_modified_on timestamp with time zone
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suggestions (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    is_completed boolean DEFAULT false,
    attachment json,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer,
    modified_by integer,
    modified_on timestamp with time zone,
    project_code character varying DEFAULT 1 NOT NULL
);


ALTER TABLE public.suggestions OWNER TO postgres;

--
-- Name: suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.suggestions_id_seq OWNER TO postgres;

--
-- Name: suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suggestions_id_seq OWNED BY public.suggestions.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    suggestion_id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    ministry smallint,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    attachment json,
    completion_percentage smallint,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer,
    modified_by integer,
    modified_on timestamp with time zone,
    task_type_id integer,
    assigned_to_id integer
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: tasks_update; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks_update (
    id integer NOT NULL,
    task_id integer NOT NULL,
    remarks character varying,
    completion_percentage smallint,
    date_of_status timestamp with time zone,
    attachment json,
    created_on timestamp with time zone DEFAULT now(),
    created_by integer,
    modified_by integer,
    modified_on timestamp with time zone
);


ALTER TABLE public.tasks_update OWNER TO postgres;

--
-- Name: tasks_update_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_update_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tasks_update_id_seq OWNER TO postgres;

--
-- Name: tasks_update_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_update_id_seq OWNED BY public.tasks_update.id;


--
-- Name: test; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.test (
    id integer NOT NULL,
    test character varying,
    created_on timestamp with time zone DEFAULT now()
);


ALTER TABLE public.test OWNER TO postgres;

--
-- Name: test_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.test_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.test_id_seq OWNER TO postgres;

--
-- Name: test_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.test_id_seq OWNED BY public.test.id;


--
-- Name: contact_update id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_update ALTER COLUMN id SET DEFAULT nextval('public.contact_update_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: facts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.facts ALTER COLUMN id SET DEFAULT nextval('public.facts_id_seq'::regclass);


--
-- Name: lists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lists ALTER COLUMN id SET DEFAULT nextval('public.lists_id_seq'::regclass);


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: login_user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_user ALTER COLUMN id SET DEFAULT nextval('public.login_user_id_seq'::regclass);


--
-- Name: map id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.map ALTER COLUMN id SET DEFAULT nextval('public.map_id_seq'::regclass);


--
-- Name: suggestions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suggestions ALTER COLUMN id SET DEFAULT nextval('public.suggestions_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: tasks_update id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks_update ALTER COLUMN id SET DEFAULT nextval('public.tasks_update_id_seq'::regclass);


--
-- Name: test id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.test ALTER COLUMN id SET DEFAULT nextval('public.test_id_seq'::regclass);


--
-- Name: login_user login_user_login_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_user
    ADD CONSTRAINT login_user_login_name_key UNIQUE (login_name);


--
-- Name: projects projects_project_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_code_key UNIQUE (project_code);


--
-- Name: projects projects_project_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_project_name_key UNIQUE (project_name);


--
-- Name: idx_contact_update_contact_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contact_update_contact_id ON public.contact_update USING btree (contact_id);


--
-- Name: idx_contacts_suggestion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_suggestion_id ON public.contacts USING btree (suggestion_id);


--
-- Name: idx_facts_suggestion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_facts_suggestion_id ON public.facts USING btree (suggestion_id);


--
-- Name: idx_lists_list_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lists_list_group ON public.lists USING btree (list_group);


--
-- Name: idx_map_suggestion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_map_suggestion_id ON public.map USING btree (suggestion_id);


--
-- Name: idx_tasks_suggestion_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_suggestion_id ON public.tasks USING btree (suggestion_id);


--
-- Name: idx_tasks_update_task_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_update_task_id ON public.tasks_update USING btree (task_id);


--
-- PostgreSQL database dump complete
--

