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

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  
  const maker = provider.wallet;
  const taker = anchor.web3.Keypair.generate();
  const seed = new anchor.BN(12345);
  let mintA: PublicKey;
  let mintB: PublicKey;
  let makerMintAAta: PublicKey;
  let vault: PublicKey;
  const decimals = 9;
  let makerMintBAta: PublicKey;
  let takerMintAAta: PublicKey;
  let takerMintBAta: PublicKey;
  
  const [escrow, escrowBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), maker.publicKey.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  before(async () => {
    mintA = await createMint(
      provider.connection,
      maker.payer,
      maker.publicKey,
      null,
      decimals
    );
    
    mintB = await createMint(
      provider.connection,
      maker.payer,
      maker.publicKey,
      null,
      6
    );
    
    const makerMintAAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      maker.publicKey
    );
    makerMintAAta = makerMintAAccount.address;

    const makerMintBAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintB,
      maker.publicKey
    );
    makerMintBAta = makerMintBAccount.address;

    const takerMintAAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintA,
      taker.publicKey
    );
    takerMintAAta = takerMintAAccount.address;

    const takerMintBAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mintB,
      taker.publicKey
    );
    takerMintBAta = takerMintBAccount.address;
    
    await mintTo(
      provider.connection,
      maker.payer,
      mintA,
      makerMintAAta,
      maker.publicKey,
      1000000000
    );

    await mintTo(
      provider.connection,
      maker.payer,
      mintB,
      takerMintBAta,
      maker.publicKey,
      1000000000
    )
    
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
      .accountsPartial({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerMintAAta: makerMintAAta,
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

  it("take and close vault", async () => {
    const receiveAmount = new anchor.BN(2000000);
    const tx = await program.methods
      .take(receiveAmount,
        decimals)
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintB: mintB,
        mintA: mintA,
        takerMintBAta: takerMintBAta,
        takerMintAAta : takerMintAAta,
        makerMintBAta : makerMintBAta,
        escrow: escrow,
        vault: vault,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([taker])
      .rpc();
    console.log("\nYour transaction signature", tx);
  });
  
  // it("refund tokens and close escrow", async () => {
   
  //   const tx = await program.methods
  //     .refund()
  //     .accountsPartial({
  //       maker: maker,
  //       mintA: mintA,
  //       makerMintAAta: makerMintAAta,
  //       escrow: escrow,
  //       vault: vault,
  //       associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
  //       tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .rpc();
  //   console.log("\nYour transaction signature", tx);
  // });

  
  });