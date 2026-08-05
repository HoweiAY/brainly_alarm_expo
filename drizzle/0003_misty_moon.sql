CREATE TABLE `alarm_registrations` (
  `alarm_id` text NOT NULL,
  `type` text NOT NULL,
  PRIMARY KEY (`alarm_id`, `type`)
);

INSERT INTO `alarm_registrations` (`alarm_id`, `type`)
  SELECT DISTINCT `alarm_id`, 'weekly' FROM `scheduled_alarms`
  WHERE `type` = 'weekly';

INSERT INTO `alarm_registrations` (`alarm_id`, `type`)
  SELECT DISTINCT `alarm_id`, 'snooze' FROM `scheduled_alarms`
  WHERE `type` = 'snooze';

DROP TABLE `scheduled_alarms`;