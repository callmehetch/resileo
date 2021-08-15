INSERT INTO lists (list_name,description,list_group,created_by)VALUES('Coding','Development cycle Coding','Task Type',1);

INSERT INTO lists (list_name,description,list_group,created_by)VALUES('Coding','Development cycle Coding','Task Type',1);
INSERT INTO lists (list_name,description,list_group,created_by)VALUES('Coding','Development cycle Coding','Task Type',1);
INSERT INTO lists (list_name,description,list_group,created_by)VALUES('Coding','Development cycle Coding','Task Type',1);
INSERT INTO lists (list_name,description,list_group,created_by)VALUES('Coding','Development cycle Coding','Task Type',1);
INSERT INTO lists (list_name,description,list_group,created_by)VALUES('Coding','Development cycle Coding','Task Type',1);




CREATE TABLE projects (
	project_code VARCHAR UNIQUE,
	project_name VARCHAR UNIQUE,
	description VARCHAR,
	start_date TIMESTAMP WITH TIME ZONE,
	end_date TIMESTAMP WITH TIME ZONE,
	department_id INT,
	project_type_id INT,
	active_flag BOOLEAN DEFAULT true,
	delete_flag BOOLEAN DEFAULT false,
	created_by INT,
	created_on TIMESTAMP WITH TIME ZONE DEFAULT now(),
	last_modified_by INT,
	last_modified_on TIMESTAMP WITH TIME ZONE
);

INSERT INTO projects VALUES ('Test-01','First project','Test project created',1,'2020-04-01','2020-04-30',1,1,now(),true,false);


ALTER TABLE tasks ADD COLUMN task_type_id INT;
ALTER TABLE tasks ADD COLUMN assigned_to_id INT;

ALTER TABLE suggestions ADD COLUMN project_code INT NOT NULL;

05-May-2020
ALTER TABLE projects ADD COLUMN project_manager_id INT NOT NULL DEFAULT 1;

ALTER TABLE suggestions ADD COLUMN owner_id INT NOT NULL DEFAULT 1;




-- 14-May-2020

CREATE TABLE teams (
  id SERIAL UNIQUE NOT NULL,
  project_code VARCHAR,
  user_id INT,
  active_flag BOOLEAN NOT NULL DEFAULT true,
  added_by INT,
  added_on TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by INT,
  last_modified_on TIMESTAMPTZ,
  PRIMARY KEY(project_code,user_id)
);

ALTER TABLE login_history ADD COLUMN logout_at TIMESTAMPTZ;

-- 16-May-2020
UPDATE teams SET active_flag = true 
FROM projects 
WHERE projects.project_code = teams.project_code AND projects.project_manager_id = teams.user_id 
AND teams.active_flag = false;


-- 28-May-2020
CREATE UNIQUE INDEX lists_unq_idx ON lists (list_group, (lower(list_name)));

UPDATE projects SET active_flag = true WHERE active_flag IS NULL;

-- Prod upgraded till here on 16-May-2020
