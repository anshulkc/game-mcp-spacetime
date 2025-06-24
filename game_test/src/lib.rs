use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp}; // like namespace in c++, stuff inside is a trait, type-level construct in Rust 

// a table is a collection of records that are stored in the database
// a reducer is a function that is called when a record is inserted, updated, or deleted (CRUD operations)

// using this for testing

// ex: Result<String, String> --> String is the success type, String is the error type

#[table(name = user, public)]
pub struct User {
    #[primary_key] // marks the field as table's primary key
    identity: Identity, // 256-bit unsigned integer
    name: Option<String>, // can be string or no name
    online: bool,
}

#[table(name = message, public)]
pub struct Message {
    sender: Identity,
    sent: Timestamp, // A point in time, measured in microseconds since the Unix epoch
    text: String,
}

// Result type used for returning and propogating errors
#[reducer]
pub fn set_name(ctx: &ReducerContext, name: String) -> Result<(), String> {
    // Called when the module is initially published
    let name = validate_name(name)?;
    // access database through ctx.db and use the user table and find the record where the identity matches the ctx.sender
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User {
            name: Some(name),
            ..user // updates the explict fields that are explicitly set
        });
        Ok(()) 
    } else {
        Err("Cannot set name for unknown user".to_string())
    }
}

fn validate_name(name: String) -> Result<String, String> {
    if name.is_empty() {
        Err("Names must not be empty".to_string())
    } else {
        Ok(name)
    }
}

#[reducer]
/// Clients invoke this reducer to send messages.
pub fn send_message(ctx: &ReducerContext, text: String) -> Result<(), String> {
    let text = validate_message(text)?;
    log::info!("{}", text);
    ctx.db.message().insert(Message {
        sender: ctx.sender,
        text,
        sent: ctx.timestamp,
    });
    Ok(())
}

/// Takes a message's text and checks if it's acceptable to send.
fn validate_message(text: String) -> Result<String, String> {
    if text.is_empty() {
        Err("Messages must not be empty".to_string())
    } else {
        Ok(text)
    }
}

// below are lifecycle reducers, they are called when the module is initially published, a client connects, a client disconnects, etc.
// they are not called when a record is inserted, updated, or deleted

#[reducer(client_connected)]
// Called when a client connects to a SpacetimeDB database server
pub fn client_connected(ctx: &ReducerContext) {
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        // If this is a returning user, i.e. we already have a `User` with this `Identity`,
        // set `online: true`, but leave `name` and `identity` unchanged.
        ctx.db.user().identity().update(User { online: true, ..user });
    } else {
        // If this is a new user, create a `User` row for the `Identity`,
        // which is online, but hasn't set a name.
        ctx.db.user().insert(User {
            name: None,
            identity: ctx.sender,
            online: true,
        });
    }
}

#[reducer(client_disconnected)]
// Called when a client disconnects from SpacetimeDB database server
pub fn identity_disconnected(ctx: &ReducerContext) {
    if let Some(user) = ctx.db.user().identity().find(ctx.sender) {
        ctx.db.user().identity().update(User { online: false, ..user });
    } else {
        // This branch should be unreachable,
        // as it doesn't make sense for a client to disconnect without connecting first.
        log::warn!("Disconnect event for unknown user with identity {:?}", ctx.sender);
    }
}