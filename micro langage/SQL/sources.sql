CREATE DATABASE IF NOT EXISTS journalisticDSL;
USE journalisticDSL;

DROP TABLE sources;

CREATE TABLE IF NOT EXISTS sources (
	name varchar(255),
	reliability int,
	CONSTRAINT C_RELAIBILITY CHECK (reliability >= 0 AND reliability <= 5),
	PRIMARY KEY (name)
);

INSERT INTO sources VALUES ('BUZZFEED', 2);
INSERT INTO sources VALUES ('FIGARO', 4);
INSERT INTO sources VALUES ('LE MONDE', 4);
INSERT INTO sources VALUES ('AFP', 5);
INSERT INTO sources VALUES ('GAMEBLOG', 3);
INSERT INTO sources VALUES ('WASHINGTON POST', 4);
INSERT INTO sources VALUES ('HUFFPOST', 4);
INSERT INTO sources VALUES ('ANONYME', 3);




CREATE TABLE IF NOT EXISTS journalist (
	name varchar(255),
	nbReviews int CHECK (nbReviews>=0),
	averageMark int,
	CONSTRAINT C_AVERAGEMARK CHECK (averageMark >= 0 AND averageMark <= 100),
	PRIMARY KEY (name)
);