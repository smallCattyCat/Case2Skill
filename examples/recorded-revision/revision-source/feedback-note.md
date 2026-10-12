# Application feedback
Evidence: a recorded model run on the local simulated service, not a production incident.
The saved prompt, model actions and public responses were checked against each other and replayed by the local controller.
The model attempted 1 lookup(s) while its supplied contract explicitly marked lookup unavailable.
A lookup in that stated condition returns no additional execution evidence and consumes an interaction. This is an efficiency diagnostic, not proof of a failed user task or a causal effect of the skill.
Proposed revision scope: prioritize the CURRENT task contract over the source case procedure, while preserving valid recovery paths and separate new business requests.
Do not generalize to never using lookup: its availability and usefulness can differ in a new task.
