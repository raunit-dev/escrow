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
        seeds: u64,
        recieve_amount: u64,
        decimals: u8
    ) -> Result<()> {
        ctx.accounts.init_escrow_state(seeds,recieve_amount,&ctx.bumps)?;
        ctx.accounts.deposit(recieve_amount,decimals)
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
