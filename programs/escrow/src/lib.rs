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
        receive_amount: u64,
        amount: u64,
    ) -> Result<()> {
        ctx.accounts.init_escrow_state(seeds, receive_amount, &ctx.bumps)?;
        ctx.accounts.deposit(amount)?;
        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()
    }

    pub fn take(
        ctx: Context<Take>
    ) -> Result<()> {
        ctx.accounts.deposit()?;
        ctx.accounts.withdraw_and_close_vault()?;
        Ok(())
    }

}
