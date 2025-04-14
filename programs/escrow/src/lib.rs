#![allow(unexpected_cfgs)]
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;

pub use instructions::*;
pub use state::*;



declare_id!("4vwUc38yQZ97hhspt9iQwjWNS5rJ56uWUDSBwofeDriE");

#[program]
pub mod escrow {
    use super::*;

    pub fn make(
        ctx: Context<Make>,
        seed: u64,
        recieve_amount: u64,
        decimal: u8
    ) -> Result<()> {
        ctx.accounts.init_escrow_state(seed, &ctx.bumps ,recieve_amount)?;
        ctx.accounts.deposit(recieve_amount,decimal)
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()
    }

    pub fn take(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.deposit(amount,decimals)?;
    }

    pub fn withdraw(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.withdraw()?;
    }

    pub fn close_account(ctx: Context<Take>) -> Result<()> {
        ctx.accounts.close_vault()?;
    }
}
