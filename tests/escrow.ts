import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo
} from "@solana/spl-token";
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  
  const maker = provider.wallet.publicKey;
  const seed = new anchor.BN(12345);
  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerMintAAta: PublicKey;
  let vault: PublicKey;
  const decimals = 9;
  
  const [escrow, escrowBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  before(async () => {
    mintA = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      decimals
    );
    
    mintB = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );
    
    const makerMintAAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      maker
    );
    makerMintAAta = makerMintAAccount.address;
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mintA,
      makerMintAAta,
      provider.wallet.publicKey,
      1000000000
    );
    
    vault = getAssociatedTokenAddressSync(
      mintA,
      escrow,
      true
    );
  });

  it("Creates escrow and deposits tokens", async () => {
    const depositAmount = new anchor.BN(1000000000);
    const receiveAmount = new anchor.BN(2000000);

    const tx = await program.methods
      .make(
        seed,
        receiveAmount,
        depositAmount,
        decimals
      )
      .accounts({
        maker: maker,
        mintA: mintA,
        mintB: mintB,
        maker_mint_a_ata: makerMintAAta,
        escrow: escrow,
        vault: vault,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  
    console.log("\nYour transaction signature", tx);
    
    const escrowAccount = await program.account.escrowState.fetch(escrow);
    console.log("Escrow account:", escrowAccount);
    
    const vaultInfo = await provider.connection.getTokenAccountBalance(vault);
    console.log("Vault token balance:", vaultInfo.value.uiAmount);
  });
  
  it("refund tokens and close escrow", async () => {
    const tx = await program.methods
      .refund()
      .accounts({
        maker: maker,
        mintA: mintA,
        maker_mint_a_ata: makerMintAAta,
        escrow: escrow,
        vault: vault,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("\nYour transaction signature", tx);
  });
  
  }); // This closing bracket was missing - it closes the describe block
