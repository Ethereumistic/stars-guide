# stars.guide Architecture Diagram

## The "Atomic" User Flow

```mermaid
sequenceDiagram
    participant User
    participant AuthProvider as Google/Apple
    participant ConvexAuth as Convex Auth
    participant DB as Users Table
    participant DailySpark as Cron Job (Backend)

    %% 1. SIGN UP FLOW
    User->>AuthProvider: Click "Sign in with Google"
    AuthProvider->>ConvexAuth: Returns OAuth Token & Profile
    
    rect rgb(20, 30, 40)
        note right of ConvexAuth: ⚡ ATOMIC CREATION ⚡
        ConvexAuth->>DB: createOrUpdateUser()
        DB-->>DB: INSERT User + Defaults
        note right of DB: { name: "Alice", tier: "free", role: "user" }
    end
    
    ConvexAuth->>User: Session Token

    %% 2. ONBOARDING FLOW
    User->>DB: Query: api.users.current()
    DB->>User: Return User Object (birthData: null)
    User->>User: UI Redirects to /onboarding
    
    User->>DB: Mutation: updateBirthData(json)
    DB-->>DB: UPDATE User SET birthData = {...}
    
    %% 3. THE "DAILY SPARK" LOOP (RAG)
    rect rgb(40, 20, 40)
        note right of DailySpark: 07:00 AM Trigger
        DailySpark->>DB: Query users.withIndex("active")
        
        loop For Each Active User
            DB->>DailySpark: Return { name, birthData, preferences }
            note right of DailySpark: Zero extra lookups needed!
            DailySpark->>DailySpark: Calculate Transits (Astronomy Engine)
            DailySpark->>DailySpark: Generate Content (LLM)
            DailySpark->>DB: Store Notification / Spark
        end
    end