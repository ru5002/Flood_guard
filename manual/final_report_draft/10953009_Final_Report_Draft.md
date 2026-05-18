# FloodGuard: Flood Prediction and Early Warning System for Gampaha, Sri Lanka

**Module:** PUSL3190 Computing Project  
**Submission:** Final Report  
**Student:** Weherawatta Kankanamalage Hirushi Nethmini  
**Plymouth Index Number:** 10953009  
**Programme:** BSc (Hons) Software Engineering  
**Supervisor:** Hirushi Dilpriya  

## Acknowledgements

The completion of this project was supported by academic guidance, technical feedback, and encouragement from several parties. Sincere appreciation is extended to the project supervisor, Hirushi Dilpriya, for continuous guidance during the planning, development, evaluation, and reporting stages of the project. The feedback received during supervision helped refine the project scope, improve the technical direction, and maintain focus on a practical flood-warning solution for the Gampaha District.

Thanks are also extended to lecturers, peers, and family members who provided encouragement and feedback during development and testing. Their support helped the project progress from an initial idea into a working software product with prediction, mapping, user registration, alerting, and administrative capabilities.

## Abstract

Flooding remains one of the most damaging and recurring natural hazards in Sri Lanka, particularly in low-lying and densely populated areas of the Gampaha District. Existing warning practices often depend on broad regional notices, fixed river-gauge thresholds, and delayed communication. These approaches can leave residents with limited time to prepare, especially in catchments such as Aththanagalu Oya, where rainfall and river-level changes can develop quickly. This project developed FloodGuard, a web-based flood prediction and early warning system designed to provide localised flood-risk information for users and administrators in the Gampaha area.

FloodGuard was implemented as a full-stack application using a React and Vite frontend, a Node.js and Express backend, MongoDB data storage, and a Python-based machine learning layer. The system combines official river-gauge readings, local rainfall and weather information, historical hydrological data, and model-based prediction outputs. The final application includes user registration with saved location, secure user login, admin authentication, live prediction cards, an interactive map, weather monitoring, zone-based flood-risk analysis, SMS alert support through Twilio, and a basic FAQ chatbot for public guidance. The current prediction approach uses a practical hybrid model that combines official gauge thresholds, rainfall signals, and trained machine learning outputs. Random Forest evaluation achieved 77.72% overall risk-classification accuracy and 0.8168 R2 for water-level regression, while LSTM experiments achieved an R2 of 0.8279 for day-one water-level forecasting and 0.6065 for day-two forecasting.

The project was developed iteratively and tested using unit tests, integration tests, machine learning smoke tests, manual browser testing, and Docker deployment checks. The main contribution of FloodGuard is the integration of flood prediction, official gauge context, SMS-based alert delivery, and user-location matching into one accessible platform. The system demonstrates how community-facing early warning software can be built using widely available web and machine learning technologies, while also identifying future improvements such as wider field validation, richer datasets, production hardening, and direct collaboration with local disaster-management stakeholders.

**Keywords:** flood prediction, early warning, Gampaha, Aththanagalu Oya, Random Forest, LSTM, SMS alerts, React, Node.js, MongoDB.

## Table of Contents

Generate the final automatic table of contents in Microsoft Word after applying heading styles.

## List of Figures and Tables

Generate the final automatic list of figures and tables in Microsoft Word after screenshots and diagrams are inserted.

## 1. Introduction

Flooding is a recurring environmental and social problem in Sri Lanka. Its impact is strongest in communities where heavy rainfall, urban expansion, poor drainage, and low-lying terrain combine to produce rapid inundation. The Gampaha District is one such area. It contains densely populated urban and semi-urban settlements, road networks, agricultural land, and river-basin communities that are exposed to flooding during monsoon periods and extreme rainfall events. The Aththanagalu Oya basin is particularly important because it runs through and near communities where floodwater can rise quickly after sustained rainfall.

FloodGuard was created in response to this local problem. The project did not attempt to replace national warning authorities. Instead, it explored how a student software engineering project could combine available data sources, machine learning, web mapping, and SMS communication to provide earlier and clearer flood-risk information to residents and administrators. The system focused on practical usefulness: a user should be able to register with a location, view current flood-risk analysis, understand whether their area is at risk, and receive a text alert when the registered area becomes moderate, high, or critical risk.

The final application is a web-based platform with public and administrative functions. Public users can register, log in, view weather information, inspect flood predictions, use a location-aware map, and receive guidance through a basic FAQ chatbot. Administrators can authenticate separately and manage user records and alert-related information. The backend provides REST API endpoints for user authentication, prediction retrieval, official zone analysis, SMS delivery, and administrative operations. The application is deployed locally using Docker Compose, with separate containers for MongoDB, the backend API, and the frontend served through Nginx.

### 1.1 Background and Context

Early warning systems are effective only when they are timely, understandable, and actionable. International disaster-risk guidance emphasises that warning information must reach at-risk people early enough for them to respond (UNDRR, 2015; WMO, 2018). In a flood context, this means that residents require more than a generic statement that heavy rain is occurring. They need a clear indication of local risk, likely severity, and immediate action. In Sri Lanka, national organisations such as the Disaster Management Centre and the Department of Irrigation play central roles in disaster coordination and flood warning. However, broad public warning channels can still be difficult to translate into a local household decision, particularly when users want to know whether their own area is affected.

The Gampaha District requires localised attention because flood exposure is not uniform across the district. Areas such as Gampaha City, Ja-Ela, Wattala, Kelaniya, Ragama, Minuwangoda, Negombo, Katunayake, and surrounding settlements are influenced by different river basins, drainage conditions, and rainfall patterns. A useful public application therefore needs to present risk at zone level rather than only at district level. FloodGuard addresses this by mapping monitored zones to relevant official gauges where possible and by combining gauge readings with live or fallback weather context.

### 1.2 Problem Statement

The core problem addressed by this project is the gap between available flood-related data and useful public action. Data can exist in several places: weather APIs, official dashboards, rainfall datasets, river-gauge services, and manually prepared records. However, a resident may still lack a simple answer to a practical question: is flooding possible in the area where the user lives, and what should be done now?

Three related issues were identified. First, existing warning information may be too broad to support local household decisions. Secondly, some tools present data but do not link it to user-specific guidance. Thirdly, internet-based dashboards alone may not be sufficient during bad weather, power disruption, or low connectivity. SMS remains important because it can reach users without requiring them to keep a browser open. FloodGuard was therefore designed to connect prediction, user location, and SMS guidance in one system.

### 1.3 Aim and Objectives

The aim of the project was to design, implement, and evaluate a web-based flood prediction and early warning system for selected Gampaha District zones. The system was required to present local flood-risk analysis, support user registration with location details, and deliver warning guidance when a registered user's area becomes moderate, high, or critical risk.

The main objectives were:

- To develop a full-stack web application for flood-risk monitoring.
- To implement a prediction layer using hydrological and weather-related data.
- To integrate official river-gauge context where available.
- To provide a public dashboard, map, and weather view.
- To implement user registration, login, and profile storage.
- To support administrator authentication and management functions.
- To integrate SMS alerting through Twilio.
- To containerise the system for repeatable demonstration.
- To evaluate the application through functional, integration, security, manual, and model-level testing.

## 2. Background, Objectives and Deliverables

The project background was developed through review of disaster-warning needs, machine learning flood-prediction literature, and analysis of existing emergency applications. The proposal and interim stages identified a need for a local platform that did more than display generic flood information. FloodGuard therefore evolved into a system that combines prediction, official gauge data, user location, SMS delivery, and clear safety guidance.

### 2.1 Project Background

Flood prediction is a time-series problem because rainfall, river level, and ground saturation are related over time. Research has shown that machine learning models can support rainfall-runoff and flood forecasting when suitable historical data are available (Hochreiter and Schmidhuber, 1997; Kratzert et al., 2018; Le et al., 2019). LSTM networks are widely used for sequential modelling because they were designed to learn temporal dependencies, while Random Forest methods provide robust performance on tabular engineered features and are easier to interpret than some deep neural models (Breiman, 2001; Pedregosa et al., 2011).

For a student project with limited time and available data, a purely theoretical model would not have been sufficient. The final product needed to work as a demonstrable application. Therefore, FloodGuard used a practical hybrid approach. The model layer explored LSTM forecasting for water-level prediction and also used a Random Forest model for risk classification based on engineered rainfall, lag, and climate features. The application further strengthened prediction outputs by combining them with official gauge thresholds and live weather data where available. This design made the system more suitable for demonstration because it could continue to provide meaningful risk context even when one data source was unavailable.

### 2.2 Final Deliverables

The final deliverables are as follows. First, a public web interface was implemented with pages for Home, Predictions, Weather, Map, Donate, Login, Register, Profile, and FAQ chatbot support. Secondly, a backend REST API was implemented using Express and MongoDB models for users, administrators, predictions, weather data, river levels, and SMS logs. Thirdly, user authentication was completed with password hashing, JWT generation, saved location, phone number storage, and alert preference support. Fourthly, an administrative module was implemented with protected admin login and user-management features.

Fifthly, a prediction and zone-analysis module was implemented. This module retrieves official gauge data from an ArcGIS service, maps selected Gampaha zones to relevant gauges, combines gauge threshold risk with rainfall and forecast signals, and presents flood probability and risk level for each area. Sixthly, model experiments and scripts were prepared under the machine learning directory. The Random Forest model uses 3,829 dataset rows, 14-day lookback features, rainfall and climate sources, and multiple lag and trend features. LSTM experiments were also evaluated for day-one and day-two water-level forecasting. Seventhly, SMS alerting was integrated using Twilio. The service normalises Sri Lankan phone numbers, supports real Twilio delivery when credentials are configured, and records message attempts in MongoDB. Finally, Docker Compose deployment was prepared with MongoDB, backend, and frontend containers.

### 2.3 Stakeholders

The primary stakeholders are residents of selected Gampaha District areas who need clear warnings before flood conditions worsen. Secondary stakeholders include family members, volunteers, local administrators, and disaster-response personnel who need to monitor multiple areas and understand which communities may require attention. The project also has academic stakeholders: the supervisor, assessors, and future students who may use the work as a basis for extension.

The needs of these stakeholders influenced the final design. Residents require simple language, location-specific warnings, and SMS delivery. Administrators require a separated authentication flow and management dashboard. Assessors require a demonstrable system, technical evidence, testing evidence, and clear explanation of design decisions.

## 3. Literature Review

The literature review considered flood early warning, hydrological machine learning, communication channels, and web-system implementation. The review was used to justify both the prediction approach and the system architecture.

### 3.1 Flood Early Warning Systems

A flood early warning system is not only a prediction model. It normally includes risk knowledge, monitoring, warning dissemination, and response capability (WMO, 2018). UNDRR guidance similarly emphasises that warnings must be people-centred and actionable (UNDRR, 2015). This was important for FloodGuard because the project had to move beyond model output. A probability value is useful only when translated into clear user guidance. For this reason, FloodGuard presents risk labels, safety messages, gauge reasoning, map-based area information, and SMS alerts.

Sri Lanka's disaster-management context was also relevant. The Disaster Management Centre provides national disaster coordination, while the Department of Irrigation maintains river-related flood-warning responsibilities and hydrological information. FloodGuard used this context by treating official gauge data as a strong risk signal rather than relying only on a black-box model. This strengthened the practical credibility of the application because official river thresholds are directly relevant to flood warning decisions.

### 3.2 Machine Learning for Flood Prediction

Machine learning has become common in hydrological forecasting because it can model nonlinear relationships between rainfall, previous river levels, seasonality, and future water levels. LSTM networks are suitable for sequential patterns because their architecture was introduced to reduce the vanishing-gradient problems associated with earlier recurrent networks (Hochreiter and Schmidhuber, 1997). Kratzert et al. (2018) demonstrated that LSTM networks can perform strongly in rainfall-runoff modelling, and Le et al. (2019) showed the suitability of LSTM models for flood forecasting.

Random Forest is also suitable for environmental tabular prediction because it combines multiple decision trees and can handle nonlinear relationships and feature interactions (Breiman, 2001). In FloodGuard, Random Forest was used for risk-classification support with engineered features such as current water level, rainfall totals, rainfall anomaly, lagged levels, trends, seasonal encodings, and climate indicators. This complemented LSTM experimentation. The project therefore did not depend on one algorithm alone; it evaluated model behaviour and selected a practical application-level combination of model output and official threshold rules.

### 3.3 Web Technologies and Security

The application was implemented with React, Node.js, Express, and MongoDB. React supports component-based user-interface development and state-driven rendering, which made it suitable for pages such as Predictions, Weather, Register, Profile, and the FAQ chatbot (React, 2026). Node.js and Express supported a lightweight REST API with route and controller separation (Node.js, 2026; Express, 2026). MongoDB was selected because the system stores flexible documents such as prediction records, SMS logs, weather readings, users, and admin records (MongoDB, 2026).

Security considerations were informed by common web-application guidance. OWASP identifies broken access control and authentication failures as major web risks, while the OWASP API Security Top 10 highlights object-level and property-level authorization issues (OWASP, 2021; OWASP, 2023). FloodGuard addressed these risks at project scale by using separate user and admin flows, JWT-based admin protection, password hashing, protected admin routes, and testing for unauthorized API access.

## 4. Method of Approach

The project used an iterative engineering approach. Rather than attempting to build every feature at once, the work was divided into planning, analysis, implementation, integration, testing, refinement, and reporting. This was appropriate because the project included several dependent parts: frontend interface, backend API, database schema, prediction scripts, external APIs, SMS delivery, and Docker deployment.

### 4.1 Requirements Elicitation

Requirements were gathered from the proposal, PID, interim analysis, review of existing disaster applications, local flood-warning needs, and practical testing of the developing system. The interim stage identified public interest in SMS alerting, maps, weather monitoring, and a simple dashboard. These findings were converted into functional requirements for user registration, prediction viewing, weather viewing, map interaction, admin login, user management, and alert delivery.

The project also applied feasibility thinking. Operational feasibility was addressed by using familiar web technologies and a simple browser-based interface. Technical feasibility was addressed by using widely documented technologies and by separating the machine learning layer from the main web API. Economic feasibility was addressed by using open-source tools and a Twilio trial-compatible SMS integration for demonstration.

### 4.2 Development Methodology

The development methodology was iterative and feature-driven. The first iteration established the project structure, Docker environment, database connection, backend routing, and frontend pages. Later iterations added authentication, admin management, prediction APIs, weather and map integration, machine learning scripts, SMS logging, Twilio configuration, user-location matching, and the FAQ chatbot. This approach reduced risk because each feature could be tested independently before being combined into the larger application.

Version control and local testing were used throughout development. Docker Compose was used to make the application easier to demonstrate because MongoDB, backend, and frontend services could be started together. Automated tests were added for backend behaviour such as phone-number normalisation, JWT behaviour, official gauge risk classification, weather-zone mapping, and user authentication. Manual tests were used for visual pages, map display, registration flow, prediction cards, location permission, and SMS-trigger behaviour.

### 4.3 Ethical and Safety Considerations

FloodGuard deals with safety-related information. For that reason, the system wording avoids claiming certainty where only risk estimation is possible. Risk levels are presented as warnings and guidance rather than official evacuation orders. Emergency messages direct users to recognised emergency channels such as the Disaster Management Centre emergency number. The system also avoids over-collection of personal data; the user profile stores only information required for account access and alert matching, such as name, email, phone number, saved location, and optional address or nearest landmark.

The project also considered responsible handling of secrets. Twilio credentials and API keys are environment variables and should not be committed to a public repository. The report and appendices should not include real tokens or screenshots that expose secret values. If a token has already appeared in a screenshot or chat, it should be rotated before final submission.

## 5. Requirements Specification

The final requirements were grouped into functional and non-functional requirements. These requirements reflect the delivered product rather than only the initial proposal.

### 5.1 Functional Requirements

| ID | Requirement | Implementation status |
|---|---|---|
| FR1 | Register public users with name, phone number, email, password, location, and address or nearest landmark. | Implemented in Register page and user controller. |
| FR2 | Authenticate public users and store session data for location-based alert matching. | Implemented using JWT generation and frontend user data storage. |
| FR3 | Display flood-risk predictions for monitored Gampaha zones. | Implemented through prediction cards with risk level, rainfall, water level, probability, and reason. |
| FR4 | Display monitored areas on an interactive map. | Implemented using Leaflet and React-Leaflet. |
| FR5 | Integrate official gauge data where available. | Implemented through Irrigation Department ArcGIS service and zone-to-gauge mapping. |
| FR6 | Send SMS alerts when the registered user location has moderate, high, or critical risk. | Implemented using Twilio service, SMS logs, and user-location alert endpoint. |
| FR7 | Provide administrator authentication and user management. | Implemented using admin routes, JWT middleware, and admin pages. |
| FR8 | Provide weather and forecast context for monitored areas. | Implemented through OpenWeather-supported services and fallback behaviour. |
| FR9 | Provide basic public FAQ support. | Implemented through a rule-based frontend chatbot. |

### 5.2 Non-Functional Requirements

| ID | Requirement | Evidence |
|---|---|---|
| NFR1 | Usability | Plain-language cards, banners, risk colours, and FAQ answers. |
| NFR2 | Reliability | Fallback dataset values, official gauge support, and graceful frontend errors. |
| NFR3 | Security | Password hashing, JWT admin protection, environment variables, and protected route tests. |
| NFR4 | Maintainability | Separate frontend pages/components, backend routes/controllers/services/models, and ML scripts. |
| NFR5 | Deployability | Docker Compose stack with MongoDB, backend, and frontend services. |
| NFR6 | Performance | Vite production build passes; prediction data refreshes automatically without blocking navigation. |

## 6. System Architecture and Design

FloodGuard follows a layered architecture. The frontend is a React single-page application. The backend is an Express REST API. MongoDB stores persistent application data. Python scripts support machine learning prediction. External services provide weather data, official gauge data, and SMS delivery. Docker Compose orchestrates the services for demonstration.

### 6.1 High-Level Architecture

The frontend communicates with the backend through HTTP API routes under the `/api` path. In Docker deployment, Nginx serves the frontend and proxies API traffic to the backend container. The backend connects to MongoDB using Mongoose. Prediction APIs call service modules that fetch official gauge data, weather data, and model output. SMS-related endpoints call the Twilio service wrapper, which sends messages when credentials are configured or records simulated messages during development.

This separation improves maintainability. The frontend is responsible for presentation and user interaction. The backend is responsible for validation, authentication, data access, prediction orchestration, and SMS delivery. The database stores user accounts, prediction records, weather readings, river-level records, admin records, and SMS logs. The machine learning directory contains training and prediction scripts and model evaluation outputs.

### 6.2 Database Design

The main MongoDB models are User, Admin, Prediction, WeatherData, RiverLevel, and SMSLog. The User model stores public user details including name, email, phone, saved zone, address, active status, and alert settings. The Admin model stores administrator credentials and role information. The Prediction model stores generated prediction records with location, risk level, water level, rainfall, confidence, flood probability, source, model version, generation time, and validity period. The WeatherData and RiverLevel models store environmental readings. The SMSLog model records message attempts, phone number, zone, risk level, status, Twilio SID where available, and sent time.

A document database was appropriate because prediction and weather records may include additional metadata depending on the source. For example, official-gauge predictions include mapped basin, threshold information, forecast rainfall, and source labels. MongoDB's document model allowed this information to be stored without forcing premature relational normalisation.

### 6.3 Prediction Design

The prediction design combines model-based and rule-based signals. The trained Random Forest model uses a 14-day lookback and engineered features including rainfall totals, rainfall anomaly, lagged water levels, rolling means, trend values, temperature, and seasonality encodings. LSTM experiments were conducted for sequential water-level forecasting. At application level, the prediction page also uses official gauge thresholds from the ArcGIS gauge service. The highest relevant risk signal is surfaced to the user when official gauge risk and model risk differ.

This hybrid design was selected because official gauge thresholds are immediately interpretable and relevant to flood warning, while machine learning can capture historical patterns and trends. The system therefore avoids depending on a single source. It can present risk reasoning such as mapped gauge, basin, water level, rainfall, and analysis type.

### 6.4 User Alert Design

The user alert flow begins when a user registers with a saved location. On the prediction page, the frontend reads the saved user location and compares it with current prediction locations using normalised location matching. If the matching prediction is moderate, high, or critical, the frontend calls the backend user-location alert endpoint. The backend verifies that the user exists, is active, has alerts enabled, has a phone number, and that the prediction location matches the registered zone. It then checks the SMS log to prevent repeated messages for the same zone and risk level within a short period. If allowed, the SMS service sends a message through Twilio or records a simulated message.

The alert wording is risk-specific. A moderate alert tells users to stay alert, prepare essentials, and avoid low-lying areas. A high or critical warning tells users that flooding is possible and advises movement to a safe place if water rises. This design keeps the message clear while avoiding unsupported claims of certainty.

## 7. Implementation

The implementation produced a working full-stack application. The following sections describe the main implemented components.

### 7.1 Frontend Implementation

The frontend was built using React and Vite. React Router provides navigation between public and admin pages. The public navigation includes Home, Predictions, Weather, Donate, Register, Login, and Profile. The Predictions page is the main operational page. It fetches latest predictions, summary data, live prediction data, and official zone predictions. It displays monitored zone cards, flood probability bars, risk badges, mapped gauge information, live-refresh status, a registered-location alert banner, and the interactive map.

The Weather page presents weather context for relevant monitoring areas. The Register page now includes a location selection field and address or nearest landmark field, which allows future alerts to be matched to a user's saved area. The Profile page supports saved profile information and alert settings. The FAQ chatbot was added as a lightweight support feature. It is rule-based rather than AI-powered, which makes it predictable, fast, and suitable for offline-style project demonstration.

### 7.2 Backend Implementation

The backend was implemented with Node.js and Express. The application uses route files for user, admin, prediction, SMS alert, machine learning, and data pipeline endpoints. Controllers contain business logic, while service files handle specific external or reusable behaviours such as SMS sending, weather fetching, official gauge retrieval, and forecast processing. Mongoose models define persistent data structures.

User authentication includes email normalisation, password hashing with bcryptjs, duplicate email prevention, JWT creation, and login validation. Admin authentication is separated from public user authentication. Admin routes use middleware to protect sensitive operations. Prediction routes provide latest predictions, prediction summaries, live prediction generation, and official zone predictions. SMS routes and user-location alert endpoints provide both manual and automated warning support.

### 7.3 Machine Learning Implementation

The machine learning work was implemented in the `ml` directory. Data files include processed climate and rainfall datasets, training features, and model artifacts. The Random Forest model version `rf-aththanagalu-climate-v4` was trained on 3,829 dataset rows with 3,814 training rows and a 14-day lookback. It used rainfall, climate, seasonality, lag, and trend features. Evaluation produced 77.72% overall risk-classification accuracy, 57.72% balanced accuracy, 0.5979 macro F1, 0.7633 weighted F1, water-level MAE of 0.2691, and water-level R2 of 0.8168.

LSTM experiments were also carried out. The LSTM V2 evaluation used 2,669 training samples, 572 validation samples, and 573 test samples. For day-one forecasting, it achieved MAE 0.2727, RMSE 0.4487, and R2 0.8279. For day-two forecasting, it achieved MAE 0.4114, RMSE 0.6753, and R2 0.6065. These results show stronger short-term performance than longer-horizon prediction, which is consistent with the general difficulty of forecasting further into the future.

### 7.4 SMS Implementation

SMS delivery was implemented through a service wrapper around Twilio Programmable Messaging. The wrapper checks whether Twilio environment variables are configured. If they are available, it sends the message through Twilio and records the returned message SID. If they are not available, it records a simulated message. This design supports both real demonstration and development without unnecessary SMS cost.

Sri Lankan phone-number normalisation was implemented so numbers such as `0773264573` and `94773264573` are converted into E.164 format such as `+94773264573`. Tests verify this behaviour. The backend also records SMS logs to support auditability and prevent repeated alerts. This is important because repeated SMS warnings for the same risk condition can irritate users and reduce trust.

### 7.5 Docker Deployment

The system is deployed using Docker Compose with three services: MongoDB, backend, and frontend. MongoDB stores application data in a named Docker volume. The backend service is built from the project root and runs the Express API on container port 5000, exposed to the host as port 5001. The frontend is built separately and served by Nginx on host port 5173. Health checks and service dependencies are used so the backend waits for MongoDB and the frontend waits for the backend. This arrangement improves demonstration reliability.

## 8. Testing and Evaluation

Testing was conducted at several levels because the system includes UI behaviour, backend logic, database access, SMS integration, and prediction scripts.

### 8.1 Automated Testing

Backend unit tests covered Sri Lankan phone-number normalisation, Twilio configuration checks, JWT behaviour, official river-gauge threshold classification, and forecast zone alias mapping. Integration tests covered user registration and login, duplicate email rejection, invalid credential handling, public prediction endpoints, and protected route behaviour. MongoDB Memory Server and Supertest were used for backend integration testing so tests could run without depending on a live production database.

Security testing included checking that protected admin and alert-history routes returned 401 Unauthorized without a valid token. This was important because the system stores user phone numbers and alert history. The project also included checks that secrets are held in environment files rather than hard-coded into source code.

### 8.2 Machine Learning Evaluation

The Random Forest model evaluation showed reasonable overall accuracy but also highlighted a common issue in environmental risk classification: minority severe classes can be harder to classify than normal conditions. The classification report showed strong performance for the None class, with lower F1 scores for Moderate and High classes. This suggests that future work should improve class balance, add more severe flood examples, and validate the model with additional official event records.

The LSTM model showed strong day-one water-level regression performance but weaker day-two performance. This is expected because uncertainty increases as the prediction horizon extends. For the final application, this supports a cautious design: short-term prediction and official gauge context should be emphasised more strongly than long-range certainty.

### 8.3 Manual and Browser Testing

Manual testing checked the main user workflows: registering a user with phone number and location, logging in, opening the prediction page, confirming the registered-location banner, verifying SMS alert logic, checking map display, using current-location distance detection, refreshing live predictions, and confirming that mobile layouts remained usable. Browser testing also checked navigation order, responsive prediction cards, map-card layout, and hard-refresh behaviour after frontend changes.

SMS testing confirmed that the alert endpoint can identify a registered user, match a prediction location to the saved zone, detect Twilio configuration, and prevent duplicate alerts using the SMS log. This was demonstrated when a high-risk Gampaha alert returned a response indicating that a recent alert had already been sent for the same zone and risk level.

## 9. End-Project Report

The final product achieved the main aim of creating a local flood prediction and early warning platform for selected Gampaha District areas. It provides a working public interface, prediction dashboard, map, weather view, registration and login flow, saved user location, Twilio-supported SMS alerting, admin management, Docker deployment, and testing evidence.

### 9.1 Objective Evaluation

Objective 1, to develop a local flood-risk monitoring web application, was achieved. The application includes public pages and an operational prediction dashboard for monitored zones.

Objective 2, to implement a prediction layer, was achieved through the Random Forest risk model, LSTM experiments, official gauge threshold logic, and combined risk presentation. The final approach is stronger as a practical demonstrator because it combines model output with official gauge context instead of relying only on an opaque model.

Objective 3, to support SMS alerts, was achieved. The system can send real SMS messages through Twilio when credentials and verified numbers are available, and it logs SMS attempts. The alert flow is linked to registered user location and risk level.

Objective 4, to implement user and admin functionality, was achieved. Public users can register and log in, while administrators have a separated protected flow and user-management functions.

Objective 5, to provide a demonstrable deployment, was achieved through Docker Compose. The frontend, backend, and database can be built and run as a local stack.

Objective 6, to evaluate the system, was achieved through automated tests, model metrics, manual testing, and browser-level checks.

### 9.2 Business and Social Value

FloodGuard's value lies in combining local risk display with direct user guidance. A resident does not need to interpret raw gauge data alone. The system converts that data into a risk level, explanation, probability, and safety message. The SMS feature increases accessibility because users can be alerted without repeatedly checking the website. The admin side supports future expansion where local authorities or coordinators may manage users and alert records.

The project also has educational value. It demonstrates how software engineering, data science, external APIs, and deployment practices can be integrated into a realistic public-safety application. The system is not a certified official warning service, but it provides a credible prototype that could be improved through stakeholder collaboration and field validation.

### 9.3 Changes During the Project

The project direction matured during implementation. The early concept emphasised deep learning as the main prediction method. During development, the final system adopted a broader hybrid design because official gauge thresholds, rainfall forecasts, and Random Forest classification provided practical and explainable risk support for demonstration. LSTM experiments remained part of the evaluation evidence, while the application-level decision layer used the most usable combination of data sources. This was a positive engineering decision because a public warning interface needs reliability and interpretability, not only model novelty.

The SMS flow also became more location-specific. Rather than sending one generic alert to all users, the final version stores user location at registration and matches alerts to the user's saved zone. This made the system more relevant and reduced unnecessary alerts. A FAQ chatbot was also added to improve user support and answer common questions without requiring a live AI service.

## 10. Project Post-Mortem

The project post-mortem evaluates the project after completion and identifies lessons for future work.

### 10.1 What Went Well

The full-stack architecture was successfully implemented and deployed through Docker. The separation between frontend, backend, services, models, and machine learning scripts made the project easier to extend. The prediction page became the strongest part of the application because it integrates official gauge data, rainfall context, live refresh, registered-location warning, risk cards, probability bars, and a map. The SMS integration also became a meaningful project feature because it connects the prediction result directly to user action.

Testing improved confidence in the backend. Automated tests for authentication, SMS normalisation, JWT behaviour, and prediction-related logic helped catch errors that would otherwise have appeared only during demonstration.

### 10.2 Challenges and Responses

The main challenge was data availability. Flood prediction requires reliable historical rainfall, river-level, and event-label data. The project addressed this by using available hydrological time-series data, climate data, rainfall datasets, official gauge readings, and engineered features. However, future work should expand the dataset using more official flood events and field-validated labels.

A second challenge was balancing model ambition with product reliability. A pure deep learning approach is attractive academically, but a user-facing flood-warning prototype must remain explainable and functional even when API keys, weather providers, or model services are unavailable. The hybrid approach provided a more robust final result.

A third challenge was SMS testing. Twilio trial accounts require verified recipient numbers, and message delivery depends on correct credentials, sender number configuration, and recipient verification. The system addressed this with configuration checks, simulation mode, phone normalisation, and SMS logs.

### 10.3 Limitations

The system remains a prototype and should not be treated as an official flood-warning service. It has not been validated across multiple real flood seasons with ground-truth incident reports. Prediction performance is limited by the available dataset and the quality of labels. Some monitored zones use official gauge threshold analysis rather than fully trained basin-specific machine learning because the strongest model context is for Aththanagalu Oya and Dunamale. The SMS feature depends on external provider availability and correct account configuration. The frontend chatbot is rule-based, so it answers common questions but does not understand unrestricted natural language like a full AI assistant.

These limitations do not invalidate the project; they define a realistic boundary for a final-year prototype. They also provide a clear route for future improvement.

### 10.4 Lessons Learned

The main lesson was that data-driven public safety software must be both technically functional and understandable to users. Model metrics alone are not enough. A resident needs a clear risk label, local relevance, and concise guidance. Another lesson was that fallback behaviour is essential. Weather APIs can be rate-limited, Docker services can fail to start, and SMS providers can reject messages if trial conditions are not met. Designing for these cases made the project more reliable during demonstration.

A further lesson was the importance of aligning implementation with reporting. The final report should describe what the system actually does, why design decisions were made, and what evidence supports the outcome. This is stronger than simply repeating the earliest plan.

## 11. Conclusions

FloodGuard successfully demonstrates a local flood prediction and early warning platform for selected areas in the Gampaha District. It integrates a React frontend, Express backend, MongoDB database, machine learning scripts, official gauge data, live weather context, user-location matching, SMS alerts, admin management, Docker deployment, and testing evidence. The system addresses the project problem by converting flood-related data into localised risk information and practical user guidance.

The strongest contribution of the project is not any single technology but the integration of several technologies into a coherent warning workflow. A user can register with a location, view current flood-risk analysis, and receive a warning message when that location reaches a relevant risk level. Administrators can use protected management functionality. The project also demonstrates engineering maturity through fallback logic, model evaluation, automated tests, and Dockerised deployment.

Future work should focus on field validation, collaboration with disaster-management stakeholders, expansion of official datasets, improved class balance for severe flood-risk categories, production security hardening, multilingual SMS messages, and wider geographic coverage. With these improvements, FloodGuard could move from a strong academic prototype toward a more operational community flood-warning support tool.

## 12. Recommendations

The first recommendation is to strengthen the data foundation before any operational deployment. Flood prediction systems depend heavily on the quality and representativeness of historical data. The current project used available rainfall, climate, hydrological, and official gauge information, but severe flood classes remain harder to classify because such events are naturally less frequent than normal conditions. Future development should therefore collect more labelled flood events, add official incident records, include more gauge stations, and preserve metadata such as date, rainfall duration, water-level thresholds, affected area, and observed consequences. This would improve both model accuracy and confidence in severe-risk classification.

The second recommendation is to validate the system with relevant local stakeholders. The prototype demonstrates software feasibility, but a live early warning tool should be reviewed by disaster-management officers, local government representatives, community leaders, and residents from flood-prone areas. Their feedback would help improve message wording, risk-level definitions, evacuation guidance, and preferred languages. Stakeholder validation would also help prevent over-warning or under-warning, both of which can reduce public trust.

The third recommendation is to improve production security before public release. The current system includes password hashing, JWT-based protection, protected admin routes, environment variables, and basic security tests. A production version should add HTTPS enforcement, stricter CORS configuration, rate limiting, audit logs for admin actions, stronger password rules, refresh-token handling, role-based access control for all sensitive operations, and formal secret rotation. OWASP guidance should be used as the baseline for these improvements.

The fourth recommendation is to improve alert delivery reliability. SMS is useful because it reaches users without requiring them to open the web application, but SMS delivery can be affected by provider limits, trial-account restrictions, mobile-network delays, and incorrect phone formatting. A future version should support delivery-status callbacks, retry logic, message templates in Sinhala, Tamil, and English, and optional WhatsApp or push notification channels. The system should also allow administrators to review which messages were sent, delivered, failed, or skipped due to deduplication.

The fifth recommendation is to extend the user interface for accessibility. The current interface is clear enough for demonstration, but disaster-warning tools benefit from high-contrast modes, multilingual content, larger emergency buttons, offline guidance pages, and printable safety instructions. A future version should include language selection, screen-reader testing, and simplified views for mobile users because many residents may access warnings from low-end phones during bad weather.

## 13. Risk Analysis

Several project risks were identified and managed during development. The most important technical risk was data incompleteness. This was handled by combining available datasets, official gauge readings, weather data, engineered model features, and fallback behaviour. The system was not designed to silently fail when one source was unavailable; instead, it displays alternative context or uses stored values where appropriate.

A second risk was external service dependency. The application depends on services such as OpenWeather, ArcGIS gauge data, and Twilio. These services may be unavailable, rate-limited, or incorrectly configured. FloodGuard reduces this risk by checking configuration, showing fallback messages, supporting simulated SMS mode, and separating each integration into service modules. This makes failure easier to identify and reduces the chance that one provider failure breaks the entire application.

A third risk was authentication and personal-data exposure. The system stores names, emails, phone numbers, locations, and alert history. This risk was reduced by hashing passwords, separating public and admin authentication, using protected admin routes, and avoiding hard-coded secrets in the application source. However, a production release would still require deeper security review, penetration testing, and legal review of data protection responsibilities.

A fourth risk was user misunderstanding. Flood prediction tools can be dangerous if users believe probability values are guarantees. The interface therefore uses cautious language such as “flooding is possible” and “stay alert”, and it directs users to official emergency contacts. Future versions should make this boundary even clearer by stating that FloodGuard supports awareness and does not replace official evacuation instructions.

A fifth risk was demonstration reliability. Docker, local ports, Docker Desktop permissions, and environment variables can cause deployment issues on a new machine. This was reduced by containerising the system, documenting the required ports, using health checks, and keeping the installation command simple. The user guide should be followed carefully during assessment, and Docker Desktop should be started before demonstration.

## 14. Appendix Preparation Checklist

The appendix should not be treated as a storage dump. Each appendix should support a point made in the main report. The following appendix package is recommended for final submission.

Appendix A should contain the user guide. This should include installation instructions, Docker requirements, the application URL, login/register flow, prediction page usage, SMS setup notes, and admin usage. Appendix B should contain the source-code link. The link must be accessible to evaluators; if access is blocked, the project can receive zero according to the submission guidance. Appendix C should contain GitHub repository information and commit history. This should show development progression, not only one final upload.

Appendix D should contain the PID. Appendix E should contain the interim report. Appendix F should contain supervisory meeting records. If meeting records are brief, include dates, topics discussed, feedback received, and actions taken. Appendix G should contain test evidence. This should include automated test results, manual test spreadsheet evidence, screenshots of successful registration, prediction page display, SMS alert result, admin pages, and Docker containers. Appendix H should contain model evidence, including metric files, feature description, model version, and prediction plot. Appendix I should contain UI screenshots and design evidence.

Before final PDF export, all screenshots should be checked for sensitive information. Twilio tokens, API keys, JWT secrets, email inboxes, private phone numbers, and full local file paths should be hidden where possible. If real personal phone numbers are shown, they should be partially masked unless the university explicitly requires raw evidence.

## 15. Recommended Figures and Tables to Insert

Use the following visuals. Each image should be inserted near the section where it is discussed, with a numbered caption and a short explanation in the text.

| Item | What to insert | Recommended location |
|---|---|---|
| Figure 1 | Project context map showing Gampaha District and Aththanagalu Oya basin. | Section 1.1 |
| Figure 2 | High-level system architecture diagram showing React frontend, Express API, MongoDB, ML scripts, weather API, ArcGIS gauge service, and Twilio. | Section 6.1 |
| Figure 3 | Database model overview showing User, Admin, Prediction, WeatherData, RiverLevel, and SMSLog. | Section 6.2 |
| Figure 4 | Prediction workflow diagram showing data sources, feature/model layer, risk combination, frontend display, and SMS trigger. | Section 6.3 |
| Figure 5 | Home page screenshot. | Section 7.1 or User Guide |
| Figure 6 | Register page screenshot clearly showing location field and address/landmark field. | Section 7.1 |
| Figure 7 | Predictions page screenshot showing zone cards, registered-location alert banner, and map. | Section 7.1 |
| Figure 8 | Example high-risk or moderate-risk registered-location banner. | Section 7.4 or Testing |
| Figure 9 | Twilio verified recipient or SMS log evidence, with secret values hidden. | Section 8.3 or Appendix Testing Evidence |
| Figure 10 | Admin login page screenshot. | Section 7.2 |
| Figure 11 | Admin user-management screenshot. | Section 7.2 |
| Figure 12 | Docker Desktop containers screenshot showing frontend, backend, and MongoDB running. | Section 7.5 |
| Figure 13 | Random Forest model evaluation evidence from `ml/results/rf_metrics.json` and `ml/results/rf_classification_report.txt`. | Section 8.2 |
| Table 1 | Functional requirements and implementation status. | Section 5.1 |
| Table 2 | Non-functional requirements and evidence. | Section 5.2 |
| Table 3 | Machine learning metrics: RF accuracy, balanced accuracy, macro F1, weighted F1, and water-level MAE/R2. | Section 8.2 |
| Table 4 | Test summary showing unit, integration, security, manual, browser, and ML smoke tests. | Section 8.1 |

## 16. User Guide

Minimum platform specification: Windows 10/11, macOS, or Linux; Docker Desktop or Docker Engine with Docker Compose; at least 8 GB RAM recommended; stable internet connection for weather, gauge, and Twilio services; modern browser such as Chrome, Edge, or Firefox.

Installation for demonstration:

1. Open a terminal in the project root folder.
2. Ensure Docker Desktop is running.
3. Configure required environment variables in the `.env` file.
4. Run `docker compose up -d --build`.
5. Open `http://localhost:5173`.

Public user operation: open `http://localhost:5173`, register with name, phone number, email, password, location, and address or nearest landmark. Log in, then open the Predictions page. If the saved location has moderate, high, or critical risk, the registered-location banner will show a warning and the backend will process an SMS alert. The Weather page shows weather context, and the chatbot button can be used for basic FAQ support.

Administrator operation: open the admin login page, authenticate with the configured admin account, and use the dashboard and user-management pages. Admin routes are protected and should not be accessible without a valid token.

SMS setup: Twilio trial accounts require a verified recipient number. Environment variables must include `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`. Secret values must not be included in screenshots or public submissions.

## 17. Project Source Code Link

Project repository link: **[Insert GitHub repository URL here]**.

Source-code archive or OneDrive link: **[Insert Plymouth-accessible OneDrive source-code link here]**.

Ensure evaluator access is enabled before submission. Failing to include an accessible source-code link may result in a zero mark for the project according to the final report guidance.

## 18. GitHub Commit History

Include exported GitHub commit history in this appendix. The screenshot or exported log should show meaningful commits covering setup, frontend pages, backend API, prediction integration, SMS alerts, testing, Docker deployment, and final report preparation.

Repository link: **[Insert GitHub repository URL here]**.

## References

ArcGIS Developers (2026) *ArcGIS REST APIs*. Available at: https://developers.arcgis.com/rest/

Breiman, L. (2001) 'Random forests', *Machine Learning*, 45(1), pp. 5-32.

Chathurani, H., et al. (2022) Flood and vulnerability-related research on the Attanagalu Oya basin, Sri Lanka. Use the exact article details from the original interim/proposal reference list if required by the university format.

Datatracker/IETF (2015) *RFC 7519: JSON Web Token (JWT)*. Available at: https://datatracker.ietf.org/doc/html/rfc7519

Disaster Management Centre Sri Lanka (2026) *Disaster Management Centre official website*. Available at: https://www.dmc.gov.lk/

Docker (2026) *Docker Compose documentation*. Available at: https://docs.docker.com/compose/

Express.js (2026) *Express routing guide*. Available at: https://expressjs.com/en/guide/routing.html

Hochreiter, S. and Schmidhuber, J. (1997) 'Long short-term memory', *Neural Computation*, 9(8), pp. 1735-1780.

Irrigation Department Sri Lanka (2017) *Hydrological Annual 2016-2017*. Available at: https://irrigation.gov.lk/web/images/Hydrological-Annual/10_Hydrological_Annual_2016-2017.pdf

Irrigation Department Sri Lanka (2025) *Major flood warning for Aththanagalu Oya Basin*. Available at: https://www.drrweb.dmc.gov.lk/images/dmcreports/Major_Flood_warning_for_Aththanagalu_Oya_Basin_-_No_05_-_2025__1764325849.pdf

Keras (2026) *Recurrent layers API documentation*. Available at: https://keras.io/api/layers/recurrent_layers/

Kratzert, F., Klotz, D., Brenner, C., Schulz, K. and Herrnegger, M. (2018) 'Rainfall-runoff modelling using Long Short-Term Memory (LSTM) networks', *Hydrology and Earth System Sciences*, 22, pp. 6005-6022.

Leaflet (2026) *Leaflet documentation*. Available at: https://leafletjs.com/

Le, X.H., Ho, H.V., Lee, G. and Jung, S. (2019) 'Application of Long Short-Term Memory (LSTM) neural network for flood forecasting', *Water*, 11(7), 1387.

MDPI Water (2019) *Application of Long Short-Term Memory neural network for flood forecasting*. Available at: https://www.mdpi.com/2073-4441/11/7/1387

MongoDB (2026) *MongoDB documentation*. Available at: https://www.mongodb.com/docs/

Mongoose (2026) *Mongoose documentation*. Available at: https://mongoosejs.com/docs/

Node.js (2026) *Node.js documentation*. Available at: https://nodejs.org/api/

NIST (2017) *Digital Identity Guidelines: Authentication and Lifecycle Management, SP 800-63B*. Available at: https://pages.nist.gov/800-63-3/sp800-63b.html

OpenStreetMap Foundation (2026) *OpenStreetMap*. Available at: https://www.openstreetmap.org/

OpenWeather (2026) *Current weather data API documentation*. Available at: https://openweathermap.org/current

OWASP (2021) *OWASP Top 10:2021*. Available at: https://owasp.org/Top10/2021/

OWASP (2023) *OWASP API Security Top 10 2023*. Available at: https://owasp.org/API-Security/editions/2023/en/0x11-t10/

Pedregosa, F., Varoquaux, G., Gramfort, A., et al. (2011) 'Scikit-learn: Machine Learning in Python', *Journal of Machine Learning Research*, 12, pp. 2825-2830.

React (2026) *React documentation*. Available at: https://react.dev/reference/react

React Router (2026) *React Router documentation*. Available at: https://reactrouter.com/

Scikit-learn (2026) *RandomForestClassifier documentation*. Available at: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html

TensorFlow (2026) *tf.keras.layers.LSTM documentation*. Available at: https://www.tensorflow.org/api_docs/python/tf/keras/layers/LSTM

Twilio (2026) *Programmable Messaging documentation*. Available at: https://www.twilio.com/docs/sms

Twilio (2026) *Message Resource API documentation*. Available at: https://www.twilio.com/docs/sms/api/message

UNDRR (2015) *Sendai Framework for Disaster Risk Reduction 2015-2030*. Available at: https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030

Vite (2026) *Building for production*. Available at: https://vite.dev/guide/build

World Meteorological Organization (2018) *Multi-hazard Early Warning Systems: A Checklist*. Available at: https://library.wmo.int/

World Meteorological Organization (2022) *Early Warnings for All initiative*. Available at: https://wmo.int/activities/early-warnings-all

## Bibliography

The bibliography may include the project PID, proposal, interim report, test evidence, exported GitHub commit history, manual test spreadsheet, and screenshots used as appendices.

## Appendices

Appendix A: User Guide.  
Appendix B: Project Source Code Link.  
Appendix C: GitHub Commit History.  
Appendix D: Project Initiation Document.  
Appendix E: Interim Report.  
Appendix F: Records of Supervisory Meetings.  
Appendix G: Manual Test Results.  
Appendix H: Model Metrics and Training Evidence.  
Appendix I: UI Screenshots and Design Evidence.
